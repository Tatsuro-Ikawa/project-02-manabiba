import type { PrimaryCourse, UserProfile } from '@/types/auth';
import { isDemoSubscriptionPathEnabled } from '@/lib/subscription/demoSubscriptionPath';

/** ランディング等で選んだ主コースが 7日間スタートのみ（気づきノート nav 非活性） */
export function isStart7dOnly(profile: UserProfile | null | undefined): boolean {
  return profile?.enrollment?.primaryCourse === 'start7d';
}

/**
 * ホームで「7日間はメニューのスタートから」案内を出すか。
 * `start7d` かつ気づきノート未申込（AIコーチ／プレミアム／kizuki 昇格前）のときのみ。
 */
export function shouldShowStart7dHomeHint(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return isStart7dOnly(profile) && !hasAiCoachOrPremiumSignup(profile);
}

function isKizukiTrialActive(profile: UserProfile): boolean {
  const end = profile.subscription.trialEndsAt;
  if (!end || profile.subscription.plan !== 'free') return false;
  return Date.now() < end.getTime();
}

/**
 * AIコーチまたはプレミアム（プライベートコーチ）相当の「申し込み済み」か。
 * `start7d` のみ・コース未選択・お試しなしは false。
 */
export function hasAiCoachOrPremiumSignup(profile: UserProfile | null | undefined): boolean {
  if (!profile?.subscription) return false;

  const plan = profile.subscription.plan;
  if (plan === 'standard' || plan === 'premium') return true;

  const course = profile.enrollment?.primaryCourse;
  if (course === 'start7d') return false;

  // 気づきノート（kizuki）: 28日お試し中（trialEndsAt 未来）または有料プラン
  if (course === 'kizuki') {
    return isKizukiTrialActive(profile);
  }

  return false;
}

/** 会員同意の `next` が7日間スタートへ向かうか */
export function consentNextImpliesStart7d(nextPath: string): boolean {
  return nextPath === '/start-program' || nextPath.startsWith('/start-program?');
}

/** 会員同意の `next` が気づきノート本体へ向かうか */
export function consentNextImpliesKizuki(nextPath: string): boolean {
  return nextPath === '/trial_4w' || nextPath.startsWith('/trial_4w?');
}

export type KizukiNoteApplyIntent = 'ai_coach' | null;

/** `/trial_4w` 本体・設定へ入れるか（ランディングは常に可） */
export function canAccessKizukiNoteApp(
  profile: UserProfile | null | undefined,
  applyIntent: KizukiNoteApplyIntent = null
): boolean {
  if (!profile) return true;
  if (applyIntent === 'ai_coach') return true;
  return hasAiCoachOrPremiumSignup(profile);
}

/** サイドバー「ノート」・ホームの気づきノート導線を有効にするか */
export function isKizukiNoteNavEnabled(profile: UserProfile | null | undefined): boolean {
  if (!profile) return true;
  return hasAiCoachOrPremiumSignup(profile);
}

export function normalizePrimaryCourse(value: unknown): PrimaryCourse | undefined {
  if (value === 'start7d' || value === 'kizuki') return value;
  return undefined;
}

/** ランディング AIコーチ CTA 用（申し込み後は `?apply=ai_coach` で本体へ） */
export const KIZUKI_AI_COACH_APPLY_PATH = '/trial_4w?apply=ai_coach';

/** スタンダード（AIコーチ）デモ申込 */
export const STANDARD_APPLY_PATH = '/apply?plan=standard';

/** プレミアム（パーソナルコーチ）デモ申込 */
export const PREMIUM_APPLY_PATH = '/apply?plan=premium';

/** 申込フォームをスキップして気づきノートへ直行すべきか（Stripe 契約済み or デモ環境のみ） */
export function shouldSkipDemoApplyForm(
  profile: UserProfile | null | undefined,
  plan: 'standard' | 'premium'
): boolean {
  if (!profile?.subscription) return false;
  const userPlan = profile.subscription.plan;
  const hasStripe = !!profile.subscription.stripeSubscriptionId?.trim();

  if (hasStripe) {
    if (plan === 'premium') return userPlan === 'premium';
    if (userPlan === 'standard' || userPlan === 'premium') return true;
    return false;
  }

  if (!isDemoSubscriptionPathEnabled()) return false;

  if (plan === 'premium') return userPlan === 'premium';
  if (userPlan === 'standard' || userPlan === 'premium') return true;
  return hasAiCoachOrPremiumSignup(profile);
}

export const KIZUKI_AI_COACH_POST_LOGIN =
  '/post-login?next=' + encodeURIComponent(KIZUKI_AI_COACH_APPLY_PATH);
