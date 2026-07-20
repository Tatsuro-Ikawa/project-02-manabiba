import type { SubscriptionPlan } from '@/types/auth';
import { isOpenPricingPeriodActive } from '@/lib/stripe/openPricing';

export type CheckoutPlan = 'standard' | 'premium';

const CHECKOUT_PLANS: CheckoutPlan[] = ['standard', 'premium'];

export function isCheckoutPlan(raw: unknown): raw is CheckoutPlan {
  return typeof raw === 'string' && (CHECKOUT_PLANS as string[]).includes(raw);
}

function envPrice(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/** サーバー側許可リスト: Stripe Price ID → 内部プラン（通常＋任意の旧オープン Price） */
export function buildPriceIdToPlanMap(): Record<string, CheckoutPlan> {
  const map: Record<string, CheckoutPlan> = {};
  const pairs: [string | undefined, CheckoutPlan][] = [
    [envPrice('STRIPE_PRICE_STANDARD_MONTHLY'), 'standard'],
    [envPrice('STRIPE_PRICE_PREMIUM_MONTHLY'), 'premium'],
    // 移行前のオープン専用 Price が残っている場合の Webhook 解決用（任意）
    [envPrice('STRIPE_PRICE_STANDARD_OPEN_MONTHLY'), 'standard'],
    [envPrice('STRIPE_PRICE_PREMIUM_OPEN_MONTHLY'), 'premium'],
  ];
  for (const [id, plan] of pairs) {
    if (id) map[id] = plan;
  }
  return map;
}

/** カタログ上の通常 Price（税込表示の正。オープン割引は Coupon で付与） */
export function priceIdForPlan(plan: CheckoutPlan): string {
  const priceId =
    plan === 'standard'
      ? envPrice('STRIPE_PRICE_STANDARD_MONTHLY')
      : envPrice('STRIPE_PRICE_PREMIUM_MONTHLY');
  if (!priceId) {
    throw new Error(`STRIPE_PRICE_${plan === 'standard' ? 'STANDARD' : 'PREMIUM'}_MONTHLY が未設定です。`);
  }
  return priceId;
}

/**
 * オープン期間中に適用する Coupon ID。
 * 未設定時は null（Price 側がすでにオープン金額の場合など）。
 */
export function openCouponIdForPlan(plan: CheckoutPlan): string | null {
  if (!isOpenPricingPeriodActive()) return null;
  const couponId =
    plan === 'standard'
      ? envPrice('STRIPE_COUPON_OPEN_STANDARD')
      : envPrice('STRIPE_COUPON_OPEN_PREMIUM');
  return couponId ?? null;
}

export function planFromPriceId(priceId: string): CheckoutPlan | null {
  return buildPriceIdToPlanMap()[priceId] ?? null;
}

export function checkoutPlanToSubscriptionPlan(plan: CheckoutPlan): SubscriptionPlan {
  return plan;
}
