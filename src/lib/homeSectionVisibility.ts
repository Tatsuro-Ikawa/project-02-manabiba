import type { UserProfile } from '@/types/auth';

/** ホーム画面のコース別表示列（ゲスト／フリー／Aiコース／プレミアム） */
export type HomeCourseTier = 'guest' | 'free' | 'ai_course' | 'premium';

function isKizukiTrialActive(profile: UserProfile): boolean {
  const end = profile.subscription.trialEndsAt;
  if (!end || profile.subscription.plan !== 'free') return false;
  return Date.now() < end.getTime();
}

/**
 * ホームのコース列を解決する。
 * - コーチも本人の `subscription.plan` を参照（ホームはロールモードの影響を受けない）
 * - Aiコース: `standard` または 28日お試し中の `free`（`trialEndsAt` 未来）
 */
export function resolveHomeCourseTier(
  loggedIn: boolean,
  profile: UserProfile | null | undefined
): HomeCourseTier {
  if (!loggedIn || !profile?.subscription) return 'guest';

  const plan = profile.subscription.plan;
  if (plan === 'premium') return 'premium';
  if (plan === 'standard') return 'ai_course';
  if (plan === 'free' && isKizukiTrialActive(profile)) return 'ai_course';

  return 'free';
}

/** マネジメント情報（7日間スタートのみ・ゲストでは非表示） */
export function shouldShowHomeManagement(tier: HomeCourseTier): boolean {
  return tier === 'ai_course' || tier === 'premium';
}

/** バナー・道場新着・動画・記事・リンク（全コース＋ゲストで表示） */
export function shouldShowHomeSharedSections(_tier: HomeCourseTier): boolean {
  return true;
}

/** SNS（運用方針確定まで非表示） */
export function shouldShowHomeSns(): boolean {
  return false;
}

/** 広告（運用方針確定まで非表示） */
export function shouldShowHomeAd(): boolean {
  return false;
}

/** コーチからの新着（プレミアムコースのみ。28日お試しの Aiコースでは非表示） */
export function shouldShowHomeCoachNews(tier: HomeCourseTier): boolean {
  return tier === 'premium';
}
