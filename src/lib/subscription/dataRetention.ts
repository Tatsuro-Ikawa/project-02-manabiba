import type { UserProfile } from '@/types/auth';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `dataRetentionEndsAt` が未来なら残日数（切り上げ、最低1日） */
export function getDataRetentionDaysRemaining(endsAt: Date): number {
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

export function isDataRetentionActive(profile: UserProfile | null | undefined): boolean {
  const ends = profile?.subscription?.dataRetentionEndsAt;
  if (!ends) return false;
  return ends.getTime() > Date.now();
}

export function formatDataRetentionBannerMessage(daysRemaining: number): string {
  if (daysRemaining <= 0) return '';
  return `コース変更により不要となったデータは、あと${daysRemaining}日後に削除されます。`;
}

/** メッセージボード履歴の閲覧のみ許可（プレミアム→下位コース後・§2.5） */
export function canViewMessageBoardRetentionHistory(profile: UserProfile | null | undefined): boolean {
  return isDataRetentionActive(profile);
}
