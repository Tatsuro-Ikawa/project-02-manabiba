import type { ApplyBillingInfo, UserProfile } from '@/types/auth';

/** 有料コースからの復帰申込か（お試し消費済み、またはダウングレード後90日保持中） */
export function isReturningPaidSubscriber(profile: UserProfile | null | undefined): boolean {
  if (!profile?.subscription) return false;
  if (profile.subscription.trialConsumedAt) return true;
  const retention = profile.subscription.dataRetentionEndsAt;
  return !!retention && retention.getTime() > Date.now();
}

export const APPLY_WELCOME_BACK_LEAD =
  'おかえりなさい。以前のお客様情報を表示しています。内容に変更がある場合は修正してからお申し込みください。';

export const NOTE_WELCOME_BACK_LEAD =
  'おかえりなさい。気づきノートを再開しました。保存期間内のデータはそのままご利用いただけます。';

export type ApplyBillingInput = Omit<ApplyBillingInfo, 'updatedAt'>;
