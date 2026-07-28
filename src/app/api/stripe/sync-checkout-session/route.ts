import { NextRequest, NextResponse } from 'next/server';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { getStripeClient, isStripeConfigured } from '@/lib/server/stripeClient';
import { syncUserSubscriptionFromStripe } from '@/lib/server/stripeSubscriptionSync';
import { isCheckoutPlan } from '@/lib/stripe/planPrices';

export const runtime = 'nodejs';

type SyncBody = {
  sessionId?: unknown;
};

/**
 * Checkout 成功後のフォールバック同期。
 * Webhook 遅延・未到達時でも `session_id` から Firestore を更新する。
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe が未設定です。STRIPE_SECRET_KEY を設定してください。' },
      { status: 503 }
    );
  }

  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です。' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'sessionId が不正です。' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const uidFromMeta = session.metadata?.firebaseUid?.trim();
    const uidFromRef = session.client_reference_id?.trim();
    const sessionUid = uidFromMeta || uidFromRef;
    if (!sessionUid || sessionUid !== auth.uid) {
      return NextResponse.json({ error: 'この Checkout Session を同期する権限がありません。' }, { status: 403 });
    }

    if (session.mode !== 'subscription' || session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Checkout が完了していません。支払い状況を確認してください。' },
        { status: 409 }
      );
    }

    const planRaw = session.metadata?.plan;
    if (!isCheckoutPlan(planRaw)) {
      return NextResponse.json({ error: 'plan metadata が不正です。' }, { status: 422 });
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!subscriptionId || !customerId) {
      return NextResponse.json(
        { error: 'subscription / customer が Session にありません。' },
        { status: 422 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncUserSubscriptionFromStripe({
      uid: auth.uid,
      plan: planRaw,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscription,
    });

    return NextResponse.json({
      ok: true,
      plan: planRaw,
      stripeSubscriptionId: subscriptionId,
    });
  } catch (e) {
    console.error('stripe sync-checkout-session error:', e);
    const msg = e instanceof Error ? e.message : 'Checkout Session の同期に失敗しました。';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
