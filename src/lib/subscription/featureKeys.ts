/**
 * API・ルールと揃える **entitlement** キー（機能単位）。
 * 命名は docs/manabiba_01/04_SUBSCRIPTION_PRODUCT_SCOPE.md 付録 A.3 に沿う。
 */
export const FEATURE_KEYS = [
  'kizuki.morning_evening.ai_comment',
  'kizuki.weekly.ai_report',
  'kizuki.monthly.ai_report',
  'communication.message_board',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function emptyEntitlements(): Record<FeatureKey, boolean> {
  return {
    'kizuki.morning_evening.ai_comment': false,
    'kizuki.weekly.ai_report': false,
    'kizuki.monthly.ai_report': false,
    'communication.message_board': false,
  };
}
