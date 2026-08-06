import type { Trial4wDailyPlain } from '@/lib/firestore';

/** 週次グリッド「朝」の記号（TrialWeekly / ホームプレビュー / 月次で共通）
 * 達成度: ◎（2要素）→ 〇（1要素）→ △（0要素・ただし入力あり）。未入力は —。
 */
export function computeMorningCompletionSymbol(
  d: Trial4wDailyPlain | undefined,
  dateKey: string,
  todayKey: string
): { sym: string; cls: string } {
  if (dateKey > todayKey) return { sym: '—', cls: 'symbol-none' };
  const affirmation = d?.morningAffirmationDeclaration ?? null;
  const actionText = (d?.morningTodayActionText ?? d?.morningActionGoalText ?? '').trim();
  // 両要素とも未入力（null / 文字無し）は晩の未選択と同様に「—」
  if (affirmation == null && actionText.length === 0) {
    return { sym: '—', cls: 'symbol-none' };
  }
  const done1 = affirmation === 'done';
  const done2 = actionText.length > 0;
  const score = Number(done1) + Number(done2);
  if (score === 2) return { sym: '◎', cls: 'symbol-o' };
  if (score === 1) return { sym: '〇', cls: 'symbol-delta' };
  return { sym: '△', cls: 'symbol-x' };
}

/** 週次グリッド「晩（実行）」の記号: done→◎ / partial→〇 / none→△ */
export function computeEveningExecutionSymbol(
  d: Trial4wDailyPlain | undefined,
  dateKey: string,
  todayKey: string
): { sym: string; cls: string } {
  if (dateKey > todayKey) return { sym: '—', cls: 'symbol-none' };
  if (d?.eveningExecution === 'done') return { sym: '◎', cls: 'symbol-o' };
  if (d?.eveningExecution === 'partial') return { sym: '〇', cls: 'symbol-delta' };
  if (d?.eveningExecution === 'none') return { sym: '△', cls: 'symbol-x' };
  return { sym: '—', cls: 'symbol-none' };
}
