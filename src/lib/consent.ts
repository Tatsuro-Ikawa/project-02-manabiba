import type { UserProfile } from '@/types/auth';

/**
 * 利用規約・プライバシーポリシーの同意バージョン（YYYY-MM-DD）。
 * 文面を更新したら日付を更新し、再同意を要求できるようにする。
 */
export const TERMS_VERSION = '2026-03-18';
export const PRIVACY_VERSION = '2026-03-18';

export function hasAcceptedCurrentConsents(profile: UserProfile | null | undefined): boolean {
  const c = profile?.consents;
  if (!c) return false;
  return (
    c.termsVersion === TERMS_VERSION &&
    c.privacyVersion === PRIVACY_VERSION &&
    c.acceptedAt instanceof Date &&
    !Number.isNaN(c.acceptedAt.getTime())
  );
}

