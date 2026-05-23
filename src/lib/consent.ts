import type { UserProfile } from '@/types/auth';

/**
 * 利用規約・プライバシーポリシーの同意済みか。
 * 版の正本は `public/legal/terms.json` / `privacy.json` の `version`。
 */
export function hasAcceptedCurrentConsents(
  profile: UserProfile | null | undefined,
  termsVersion: string,
  privacyVersion: string
): boolean {
  const c = profile?.consents;
  if (!c) return false;
  return (
    c.termsVersion === termsVersion &&
    c.privacyVersion === privacyVersion &&
    c.acceptedAt instanceof Date &&
    !Number.isNaN(c.acceptedAt.getTime())
  );
}
