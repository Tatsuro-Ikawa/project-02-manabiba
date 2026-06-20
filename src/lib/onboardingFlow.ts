import type { UserProfile } from '@/types/auth';
import { hasAiCoachOrPremiumSignup, isStart7dOnly, shouldSkipDemoApplyForm } from '@/lib/enrollmentCourse';

/**
 * `/login?next=` および `/post-login?next=` の遷移先を正規化する。
 * `login` は常に `post-login` へラップするため、next には**最終行先のみ**を渡す。
 * 誤って `/post-login?next=...` が入っている場合は一段展開する（二重ラップ対策）。
 */
export function normalizeAuthNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/')) return '/';
  if (raw.startsWith('/post-login?')) {
    try {
      const inner = new URL(raw, 'http://local').searchParams.get('next');
      if (inner?.startsWith('/')) return inner;
    } catch {
      /* fall through */
    }
  }
  return raw;
}

/** 会員同意前かつコース未選択（初回入会の途中。誤って「ログインして続きから」を押したケース含む） */
export function isPreOnboardingUser(profile: UserProfile | null | undefined): boolean {
  return !profile?.enrollment?.primaryCourse;
}

/** 初回入会（コース選択後）の post-login `next` かどうか。`/` は再ログイン用として除外。 */
export function isFirstTimeOnboardingNext(next: string): boolean {
  if (!next || next === '/') return false;
  if (next.startsWith('/start-program')) return true;
  if (next.startsWith('/trial_4w')) return true;
  if (next.startsWith('/apply')) return true;
  return false;
}

/** 未同意ログイン後にコース選択へ戻すランディング URL */
export function landingWithNeedsConsent(next: string): string {
  const params = new URLSearchParams({ needsConsent: '1', next });
  return `/trial_4w/landing?${params.toString()}`;
}

/** 会員同意キャンセル時: ログオフ後の戻り先（ゲストとしてコース再選択） */
export const CONSENT_CANCEL_LANDING = '/trial_4w/landing';

/** 誤操作ログイン後ランディング（needsConsent=1）で「戻る」→ ログオフしてゲストホームへ */
export function isLandingBackRequiresSignOut(needsConsent: boolean, loggedIn: boolean): boolean {
  return needsConsent && loggedIn;
}

/**
 * 同意済みユーザーの post-login 最終行先。
 * 「ログインして続きから」（`next=/`）はコースに応じて解決する（導線⑧: start7d → スタート画面）。
 */
export function resolvePostLoginDestination(profile: UserProfile, nextPath: string): string {
  if (nextPath !== '/') return nextPath;
  if (isStart7dOnly(profile) && !hasAiCoachOrPremiumSignup(profile)) {
    return '/start-program';
  }
  if (hasAiCoachOrPremiumSignup(profile)) {
    return '/trial_4w';
  }
  return '/';
}

function parseApplyPlanFromPath(nextPath: string): 'standard' | 'premium' | null {
  if (!nextPath.startsWith('/apply')) return null;
  try {
    const plan = new URL(nextPath, 'http://local').searchParams.get('plan');
    if (plan === 'standard' || plan === 'premium') return plan;
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * post-login / 同意済みリダイレクトの最終行先。
 * 申込済み既会員が `/apply?plan=...` に来た場合は申込画面を経由せず `/trial_4w` へ（導線⑦等）。
 */
export function resolveOnboardingDestination(profile: UserProfile, nextPath: string): string {
  const applyPlan = parseApplyPlanFromPath(nextPath);
  if (applyPlan && shouldSkipDemoApplyForm(profile, applyPlan)) {
    return '/trial_4w';
  }
  return resolvePostLoginDestination(profile, nextPath);
}
