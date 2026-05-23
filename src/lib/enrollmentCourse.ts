import type { PrimaryCourse, UserProfile } from '@/types/auth';

/** ランディング等で選んだ主コースが 7日間スタートのみ（気づきノート nav 非活性） */
export function isStart7dOnly(profile: UserProfile | null | undefined): boolean {
  return profile?.enrollment?.primaryCourse === 'start7d';
}

/** サイドバー「ノート」・ホームの気づきノート導線を有効にするか */
export function isKizukiNoteNavEnabled(profile: UserProfile | null | undefined): boolean {
  if (!profile) return true;
  return profile.enrollment?.primaryCourse !== 'start7d';
}

export function normalizePrimaryCourse(value: unknown): PrimaryCourse | undefined {
  if (value === 'start7d' || value === 'kizuki') return value;
  return undefined;
}
