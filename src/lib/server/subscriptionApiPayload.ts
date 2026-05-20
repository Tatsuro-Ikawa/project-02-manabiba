import type { UserProfile } from '@/types/auth';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';

export function buildMeSubscriptionPayload(profile: UserProfile) {
  const s = profile.subscription;
  return {
    plan: s.plan,
    status: s.status,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate?.toISOString() ?? null,
    trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    stripeCustomerId: s.stripeCustomerId ?? null,
    stripeSubscriptionId: s.stripeSubscriptionId ?? null,
    entitlements: resolveEntitlements(profile),
  };
}
