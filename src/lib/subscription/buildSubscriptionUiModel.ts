import type { UserProfile } from '@/types/auth';
import type { SubscriptionInfo } from '@/types/subscription';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';

/**
 * UI 用 `SubscriptionInfo`（旧 `SubscriptionContext` 形）を `UserProfile` から合成する。
 */
export function buildSubscriptionUiModel(profile: UserProfile): SubscriptionInfo {
  const ent = resolveEntitlements(profile);
  const sub = profile.subscription;
  const base = SUBSCRIPTION_PLANS[sub.plan];
  const kizuki = ent['kizuki.morning_evening.ai_comment'];

  return {
    plan: sub.plan,
    features: {
      selfUnderstanding: true,
      goalSetting: true,
      pdcaFunction: kizuki ? 'full' : base.pdcaFunction,
      aiComment: kizuki || base.aiComment,
      zoomMeeting: ent['communication.message_board'] || base.zoomMeeting,
      coachComment: sub.features.coachComments || base.coachComment,
    },
    trialEndDate: sub.trialEndsAt,
    meetingCredits: undefined,
    createdAt: sub.startDate,
    updatedAt: profile.updatedAt,
  };
}
