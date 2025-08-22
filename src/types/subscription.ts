export type SubscriptionPlan = 'free' | 'standard' | 'premium';

export interface SubscriptionFeatures {
  selfUnderstanding: boolean;
  goalSetting: boolean;
  pdcaFunction: 'limited' | 'full' | 'trial';
  aiComment: boolean;
  zoomMeeting: boolean;
  coachComment: boolean;
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  features: SubscriptionFeatures;
  trialDays?: number;
  trialEndDate?: Date;
  meetingCredits?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    selfUnderstanding: true,
    goalSetting: true,
    pdcaFunction: 'limited',
    aiComment: false,
    zoomMeeting: false,
    coachComment: false,
  },
  standard: {
    selfUnderstanding: true,
    goalSetting: true,
    pdcaFunction: 'full',
    aiComment: true,
    zoomMeeting: false,
    coachComment: false,
  },
  premium: {
    selfUnderstanding: true,
    goalSetting: true,
    pdcaFunction: 'full',
    aiComment: true,
    zoomMeeting: true,
    coachComment: true,
  },
};
