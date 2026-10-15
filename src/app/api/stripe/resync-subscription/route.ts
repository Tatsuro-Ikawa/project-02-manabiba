import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { isStripeConfigured } from '@/lib/server/stripeClient';
import { syncLatestSubscription } from '@/lib/server/stripeSubscriptionSync';

export const runtime = 'nodejs';

function toMillis(v: unknown): number | null {
  if (v && typeof v === 'object' && 'toMillis' in v && typeof v.toMillis === 'function') {
    return v.toMillis() as number;
  }
  return null;
}

/**
 * Webhook 未達時の保険。請求期間が未保存、または保存済みの請求期間・お試し期限を過ぎている場合のみ Stripe の最新状態を取り直す。
 * Subscription ID はクライアント入力ではなく Firestore の保存値を使う。
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: true, result: 'skipped' });
  }

  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  try {
    const snap = await getFirebaseAdminApp().firestore().doc(`users/${auth.uid}`).get();
    const sub = snap.data()?.subscription as Record<string, unknown> | undefined;
    const subscriptionId = typeof sub?.stripeSubscriptionId === 'string' ? sub.stripeSubscriptionId : '';
    const customerId = typeof sub?.stripeCustomerId === 'string' ? sub.stripeCustomerId : '';
    if (!subscriptionId || !customerId || sub?.status === 'expired') {
      return NextResponse.json({ ok: true, result: 'skipped' });
    }

    const now = Date.now();
    const periodEnd = toMillis(sub?.currentPeriodEnd);
    const trialEnd = toMillis(sub?.trialEndsAt);
    const stale = periodEnd === null || periodEnd <= now || (trialEnd !== null && trialEnd <= now);
    if (!stale) {
      return NextResponse.json({ ok: true, result: 'fresh' });
    }

    const result = await syncLatestSubscription(auth.uid, subscriptionId, { expectedCustomerId: customerId });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error('stripe resync-subscription error:', e);
    return NextResponse.json({ error: 'サブスクリプションの再同期に失敗しました。' }, { status: 502 });
  }
}
