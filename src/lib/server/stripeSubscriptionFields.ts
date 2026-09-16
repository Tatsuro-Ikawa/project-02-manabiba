import type Stripe from 'stripe';

/** Stripe の unix 秒（number / numeric string）を正規化 */
export function asStripeUnixSeconds(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * 請求期間終了（unix 秒）。
 * API 2025-03-31.basil 以降は Subscription 直下から削除され、
 * SubscriptionItem.current_period_end に移っているため両方を見る。
 */
export function readSubscriptionCurrentPeriodEnd(
  subscription: Stripe.Subscription
): number | null {
  const raw = subscription as unknown as Record<string, unknown>;
  const fromSub = asStripeUnixSeconds(raw.current_period_end ?? raw.currentPeriodEnd);
  if (fromSub != null) return fromSub;

  const item = subscription.items?.data?.[0] as unknown as Record<string, unknown> | undefined;
  if (!item) return null;
  return asStripeUnixSeconds(item.current_period_end ?? item.currentPeriodEnd);
}

/** trial_end（Subscription 直下。なければ null） */
export function readSubscriptionTrialEnd(
  subscription: Stripe.Subscription
): number | null {
  const raw = subscription as unknown as Record<string, unknown>;
  return asStripeUnixSeconds(raw.trial_end ?? raw.trialEnd);
}
