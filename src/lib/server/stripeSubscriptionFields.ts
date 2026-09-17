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

/** お試し中（status=trialing、または trial_end が未来） */
export function isSubscriptionTrialing(subscription: Stripe.Subscription): boolean {
  if (subscription.status === 'trialing') return true;
  const trialEnd = readSubscriptionTrialEnd(subscription);
  if (trialEnd == null) return false;
  return trialEnd > Math.floor(Date.now() / 1000);
}

/**
 * ダウングレード切替日時（unix 秒）。
 * お試し中は trial_end を優先（通常は current_period_end と同値だが、権威は trial_end）。
 */
export function readDowngradeSwitchAtUnix(
  subscription: Stripe.Subscription
): number | null {
  const periodEnd = readSubscriptionCurrentPeriodEnd(subscription);
  const trialEnd = readSubscriptionTrialEnd(subscription);
  if (isSubscriptionTrialing(subscription) && trialEnd != null) return trialEnd;
  return periodEnd;
}
