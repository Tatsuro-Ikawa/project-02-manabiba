import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { resolveAppBaseUrl } from '@/lib/server/appBaseUrl';
import { saveApplyBillingAdmin } from '@/lib/server/saveApplyBillingAdmin';
import { getStripeClient, isStripeConfigured } from '@/lib/server/stripeClient';
import {
  isEligibleForStripeTrial,
  KIZUKI_TRIAL_DAYS,
} from '@/lib/server/stripeSubscriptionSync';
import { isCheckoutPlan, openCouponIdForPlan, priceIdForPlan } from '@/lib/stripe/planPrices';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type CheckoutBody = {
  plan?: unknown;
  billing?: {
    fullName?: unknown;
    postalCode?: unknown;
    address?: unknown;
    phone?: unknown;
  };
};

function parseBilling(body: CheckoutBody): {
  fullName: string;
  postalCode: string;
  address: string;
  phone: string;
} | null {
  const b = body.billing;
  if (!b || typeof b !== 'object') return null;
  const fullName = typeof b.fullName === 'string' ? b.fullName.trim() : '';
  const postalCode = typeof b.postalCode === 'string' ? b.postalCode.trim() : '';
  const address = typeof b.address === 'string' ? b.address.trim() : '';
  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  if (!fullName || !postalCode || !address || !phone) return null;
  return { fullName, postalCode, address, phone };
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe が未設定です。STRIPE_SECRET_KEY を設定してください。' },
      { status: 503 }
    );
  }

  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です。' }, { status: 400 });
  }

  if (!isCheckoutPlan(body.plan)) {
    return NextResponse.json({ error: 'plan は standard または premium を指定してください。' }, { status: 400 });
  }

  const billing = parseBilling(body);
  if (!billing) {
    return NextResponse.json({ error: 'お客様情報（氏名・住所・電話）を入力してください。' }, { status: 400 });
  }

  const profile = await getAdminUserProfile(auth.uid);
  if (!profile) {
    return NextResponse.json({ error: 'ユーザープロフィールがありません。' }, { status: 404 });
  }

  const email = profile.email?.trim() || undefined;
  if (!email) {
    return NextResponse.json({ error: 'メールアドレスが登録されていません。' }, { status: 400 });
  }

  try {
    await saveApplyBillingAdmin(auth.uid, billing);

    const userSnap = await getFirebaseAdminApp().firestore().doc(`users/${auth.uid}`).get();
    const existingSub = userSnap.data()?.subscription as Record<string, unknown> | undefined;
    const trialEligible = isEligibleForStripeTrial(existingSub);

    const existingSubId =
      typeof existingSub?.stripeSubscriptionId === 'string'
        ? existingSub.stripeSubscriptionId.trim()
        : '';
    const existingStatus =
      typeof existingSub?.status === 'string' ? existingSub.status : '';
    if (
      existingSubId &&
      ['active', 'past_due', 'cancelled', 'trialing'].includes(existingStatus)
    ) {
      return NextResponse.json(
        {
          error:
            'すでに有効なサブスクリプションがあります。プラン変更・解約はコース変更画面または Customer Portal からお手続きください。',
          code: 'USE_PORTAL',
        },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const priceId = priceIdForPlan(body.plan);
    const openCouponId = openCouponIdForPlan(body.plan);
    const baseUrl = resolveAppBaseUrl(request);
    const welcomeBack = profile.subscription.trialConsumedAt ? '1' : '0';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: auth.uid,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      // オープン期間中はサーバーが Coupon を付与（初回・再申込とも）。手入力コードは不可。
      ...(openCouponId ? { discounts: [{ coupon: openCouponId }] } : {}),
      metadata: {
        firebaseUid: auth.uid,
        plan: body.plan,
        openPricing: openCouponId ? '1' : '0',
      },
      subscription_data: {
        metadata: {
          firebaseUid: auth.uid,
          plan: body.plan,
        },
        ...(trialEligible ? { trial_period_days: KIZUKI_TRIAL_DAYS } : {}),
      },
      success_url: `${baseUrl}/apply/complete?session_id={CHECKOUT_SESSION_ID}&welcomeBack=${welcomeBack}`,
      cancel_url: `${baseUrl}/apply?plan=${body.plan}`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout URL の生成に失敗しました。' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('stripe checkout-session error:', e);
    const msg = e instanceof Error ? e.message : 'Checkout の作成に失敗しました。';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
