import type { UserProfile } from '@/types/auth';
import { emptyEntitlements, type FeatureKey } from './featureKeys';

/** `plan === 'free'` かつ `trialEndsAt` が未来のとき、気づきノートは standard 相当（プロダクトスコープ）。 */
function isKizukiTrialActive(profile: UserProfile): boolean {
  const end = profile.subscription.trialEndsAt;
  if (!end || profile.subscription.plan !== 'free') return false;
  return Date.now() < end.getTime();
}

/**
 * 解約済みでも請求期間内なら有料プランとして扱う（Stripe cancel_at_period_end 想定）。
 * `inactive` は未払い停止等の想定のため、ここでは有効とみなさない。
 */
function isPaidSubscriptionInGoodStanding(profile: UserProfile): boolean {
  const { status, currentPeriodEnd } = profile.subscription;
  if (status === 'active') return true;
  if (status === 'cancelled' && currentPeriodEnd && Date.now() < currentPeriodEnd.getTime()) {
    return true;
  }
  return false;
}

type KizukiTier = 'none' | 'standard' | 'premium';

function resolveKizukiTier(profile: UserProfile): KizukiTier {
  if (!isPaidSubscriptionInGoodStanding(profile)) {
    return isKizukiTrialActive(profile) ? 'standard' : 'none';
  }
  const { plan } = profile.subscription;
  if (plan === 'premium') return 'premium';
  if (plan === 'standard') return 'standard';
  if (plan === 'free' && isKizukiTrialActive(profile)) return 'standard';
  return 'none';
}

function messageBoardAllowed(profile: UserProfile): boolean {
  if (!isPaidSubscriptionInGoodStanding(profile)) return false;
  return profile.subscription.plan === 'premium';
}

/**
 * Firestore の `UserProfile`（正本は `users/{uid}.subscription`）から entitlement を解決する。
 * 決済の有無に依存せず、Phase A では **サーバー・クライアント双方**が同じ関数を参照できる。
 */
export function resolveEntitlements(profile: UserProfile | null): Record<FeatureKey, boolean> {
  const out = emptyEntitlements();
  if (!profile?.subscription) return out;

  const kizuki = resolveKizukiTier(profile);
  if (kizuki === 'standard' || kizuki === 'premium') {
    out['kizuki.morning_evening.ai_comment'] = true;
    out['kizuki.weekly.ai_report'] = true;
    out['kizuki.monthly.ai_report'] = true;
  }

  if (messageBoardAllowed(profile)) {
    out['communication.message_board'] = true;
  }

  return out;
}
