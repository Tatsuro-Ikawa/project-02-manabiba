import type { Trial4wDailyPlain } from '@/lib/firestore';

/** 週次グリッド「朝」の記号（TrialWeekly / ホームプレビューで共通） */
export function computeMorningCompletionSymbol(
  d: Trial4wDailyPlain | undefined,
  dateKey: string,
  todayKey: string
): { sym: string; cls: string } {
  if (dateKey > todayKey) return { sym: '—', cls: 'symbol-none' };
  const done1 = d?.morningAffirmationDeclaration === 'done';
  const done2 = !!(d?.morningTodayActionText && d.morningTodayActionText.trim());
  const done3 = d?.morningImagingDone === true;
  const score = Number(done1) + Number(done2) + Number(done3);
  if (score === 3) return { sym: '〇', cls: 'symbol-o' };
  if (score >= 1) return { sym: '△', cls: 'symbol-delta' };
  return { sym: '×', cls: 'symbol-x' };
}

/** 週次グリッド「晩（実行）」の記号 */
export function computeEveningExecutionSymbol(
  d: Trial4wDailyPlain | undefined,
  dateKey: string,
  todayKey: string
): { sym: string; cls: string } {
  if (dateKey > todayKey) return { sym: '—', cls: 'symbol-none' };
  if (d?.eveningExecution === 'done') return { sym: '〇', cls: 'symbol-o' };
  if (d?.eveningExecution === 'partial') return { sym: '△', cls: 'symbol-delta' };
  if (d?.eveningExecution === 'none') return { sym: '×', cls: 'symbol-x' };
  return { sym: '—', cls: 'symbol-none' };
}
