import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { getStripeClient, isStripeConfigured } from '@/lib/server/stripeClient';
import { syncUserSubscriptionFromStripeObject } from '@/lib/server/stripeSubscriptionSync';
import {
  isCheckoutPlan,
  openCouponIdForPlan,
  priceIdForPlan,
  type CheckoutPlan,
} from '@/lib/stripe/planPrices';

export const runtime = 'nodejs';

type ChangePlanBody = {
  plan?: unknown;
};

function readCurrentPeriodEndUnix(subscription: Stripe.Subscription): number | null {
  const raw = subscription as unknown as Record<string, unknown>;
  const value = raw.current_period_end ?? raw.currentPeriodEnd;
  return typeof value === 'number' ? value : null;
}

function subscriptionItemId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.id ?? null;
}

function currentPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

/**
 * STD ↔ PRE のプラン変更（B-4）。
 * - アップグレード: 即時・日割り請求（always_invoice）
 * - ダウングレード: 期間末から切替（Subscription Schedule）
 * - オープン期間中: 対象プランの Coupon を適用
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

  let body: ChangePlanBody;
  try {
    body = (await request.json()) as ChangePlanBody;
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です。' }, { status: 400 });
  }

  if (!isCheckoutPlan(body.plan)) {
    return NextResponse.json({ error: 'plan は standard または premium を指定してください。' }, { status: 400 });
  }

  const targetPlan = body.plan;
  const profile = await getAdminUserProfile(auth.uid);
  if (!profile) {
    return NextResponse.json({ error: 'ユーザープロフィールがありません。' }, { status: 404 });
  }

  const subId = profile.subscription?.stripeSubscriptionId?.trim();
  if (!subId) {
    return NextResponse.json(
      { error: '有効な Stripe サブスクリプションがありません。' },
      { status: 404 }
    );
  }

  const currentPlan = profile.subscription.plan;
  if (currentPlan !== 'standard' && currentPlan !== 'premium') {
    return NextResponse.json(
      { error: '有料プラン契約中のみコース変更できます。' },
      { status: 400 }
    );
  }

  if (currentPlan === targetPlan) {
    return NextResponse.json({ error: 'すでに同じコースです。' }, { status: 400 });
  }

  const isUpgrade = currentPlan === 'standard' && targetPlan === 'premium';
  const isDowngrade = currentPlan === 'premium' && targetPlan === 'standard';
  if (!isUpgrade && !isDowngrade) {
    return NextResponse.json({ error: 'このプラン変更はサポートしていません。' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subId);
    const itemId = subscriptionItemId(subscription);
    if (!itemId) {
      return NextResponse.json({ error: 'サブスクリプション明細がありません。' }, { status: 502 });
    }

    const newPriceId = priceIdForPlan(targetPlan);
    const openCouponId = openCouponIdForPlan(targetPlan);
    const discountParams = openCouponId ? { discounts: [{ coupon: openCouponId }] } : { discounts: [] };

    if (isUpgrade) {
      const updated = await stripe.subscriptions.update(subId, {
        items: [{ id: itemId, price: newPriceId }],
        proration_behavior: 'always_invoice',
        ...discountParams,
        metadata: {
          ...subscription.metadata,
          firebaseUid: auth.uid,
          plan: targetPlan,
        },
      });
      await syncUserSubscriptionFromStripeObject(auth.uid, updated);
      return NextResponse.json({
        ok: true,
        mode: 'upgrade_immediate',
        plan: targetPlan,
        openPricing: !!openCouponId,
      });
    }

    // ダウングレード: 期間末まで PRE 維持 → 翌フェーズで STD + オープン Coupon
    const periodEnd = readCurrentPeriodEndUnix(subscription);
    if (!periodEnd) {
      return NextResponse.json(
        { error: '請求期間の終了日を取得できませんでした。' },
        { status: 502 }
      );
    }

    const fromPrice = currentPriceId(subscription);
    if (!fromPrice) {
      return NextResponse.json({ error: '現在の Price を取得できませんでした。' }, { status: 502 });
    }

    let scheduleId = typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule?.id;
    if (!scheduleId) {
      const created = await stripe.subscriptionSchedules.create({
        from_subscription: subId,
      });
      scheduleId = created.id;
    }

    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    const phase0 = schedule.phases[0];
    if (!phase0) {
      return NextResponse.json({ error: 'Subscription Schedule の作成に失敗しました。' }, { status: 502 });
    }

    await stripe.subscriptionSchedules.update(scheduleId, {
      end_behavior: 'release',
      phases: [
        {
          items: [{ price: fromPrice, quantity: 1 }],
          start_date: phase0.start_date,
          end_date: periodEnd,
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          ...(openCouponId ? { discounts: [{ coupon: openCouponId }] } : {}),
          metadata: {
            firebaseUid: auth.uid,
            plan: targetPlan as CheckoutPlan,
          },
        },
      ],
    });

    // 期間末まで PRE のまま。Firestore は Webhook（updated）で schedule 反映時に追随。
    const refreshed = await stripe.subscriptions.retrieve(subId);
    await syncUserSubscriptionFromStripeObject(auth.uid, refreshed);

    return NextResponse.json({
      ok: true,
      mode: 'downgrade_at_period_end',
      plan: targetPlan,
      effectiveAt: new Date(periodEnd * 1000).toISOString(),
      openPricing: !!openCouponId,
    });
  } catch (e) {
    console.error('stripe change-plan error:', e);
    const msg = e instanceof Error ? e.message : 'プラン変更に失敗しました。';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
