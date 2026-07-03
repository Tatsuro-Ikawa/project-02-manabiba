import type { FeatureAccess, SubscriptionPlan, UsageLimits, UserProfile } from '@/types/auth';

/** プランごとの機能フラグ（`users.{uid}.subscription.features` の正本） */
export const SUBSCRIPTION_PLAN_FEATURES: Record<SubscriptionPlan, FeatureAccess> = {
  free: {
    pdca: true,
    aiComments: false,
    coachComments: false,
    zoomMeetings: false,
    communityAccess: false,
    advancedAnalytics: false,
  },
  standard: {
    pdca: true,
    aiComments: true,
    coachComments: false,
    zoomMeetings: false,
    communityAccess: true,
    advancedAnalytics: false,
  },
  premium: {
    pdca: true,
    aiComments: true,
    coachComments: true,
    zoomMeetings: true,
    communityAccess: true,
    advancedAnalytics: true,
  },
};

export function featuresForPlan(plan: SubscriptionPlan): FeatureAccess {
  return { ...SUBSCRIPTION_PLAN_FEATURES[plan] };
}

function parseSubscriptionPlan(raw: unknown): SubscriptionPlan {
  if (raw === 'standard' || raw === 'premium' || raw === 'free') return raw;
  return 'free';
}

function firestoreValueToDate(raw: unknown): Date | undefined {
  if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate();
  }
  return undefined;
}

const DEFAULT_USAGE: UsageLimits = {
  pdcaEntries: 0,
  aiComments: 0,
  zoomMeetings: 0,
  coachSessions: 0,
};

/** Firestore の `users.{uid}.subscription` をクライアント正規形へ（features を plan から補完） */
export function normalizeUserSubscription(raw: Record<string, unknown> | undefined): UserProfile['subscription'] {
  const plan = parseSubscriptionPlan(raw?.plan);
  const rawFeatures = (raw?.features ?? {}) as Partial<FeatureAccess>;
  const features: FeatureAccess = { ...featuresForPlan(plan), ...rawFeatures };
  const rawUsage = (raw?.usage ?? {}) as Partial<UsageLimits>;

  return {
    plan,
    status:
      raw?.status === 'inactive' || raw?.status === 'cancelled' || raw?.status === 'expired'
        ? raw.status
        : 'active',
    startDate: firestoreValueToDate(raw?.startDate) ?? new Date(),
    endDate: firestoreValueToDate(raw?.endDate),
    trialEndsAt: firestoreValueToDate(raw?.trialEndsAt),
    dataRetentionEndsAt: firestoreValueToDate(raw?.dataRetentionEndsAt),
    trialConsumedAt: firestoreValueToDate(raw?.trialConsumedAt),
    currentPeriodEnd: firestoreValueToDate(raw?.currentPeriodEnd),
    stripeCustomerId: typeof raw?.stripeCustomerId === 'string' ? raw.stripeCustomerId : undefined,
    stripeSubscriptionId: typeof raw?.stripeSubscriptionId === 'string' ? raw.stripeSubscriptionId : undefined,
    features,
    usage: { ...DEFAULT_USAGE, ...rawUsage },
  };
}

/** パーソナルコーチ（コーチ共有・コーチコメント）が有効か */
export function hasCoachCommentsFeature(profile: UserProfile | null | undefined): boolean {
  if (!profile?.subscription) return false;
  const sub = profile.subscription;
  if (sub.features?.coachComments === true) return true;
  if (sub.plan === 'premium') return true;
  return featuresForPlan(sub.plan).coachComments;
}
