import type { UserProfile } from '@/types/auth';

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
