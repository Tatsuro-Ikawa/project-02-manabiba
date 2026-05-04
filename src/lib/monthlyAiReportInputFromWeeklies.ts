import { formatWeekRangeLabelJa } from '@/lib/journalWeek';
import type { JournalWeeklyPlain } from '@/lib/firestore';

function nz(v: string | null | undefined): string {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : '無し';
}

/**
 * 月次 Aiレポート用インプット：暦月内の各週の `journal_weekly` 相当フィールドを週単位で連結する。
 * 値が無い項目は「無し」とする。
 */
export function buildMonthlyAiReportInputFromWeeklies(weeks: JournalWeeklyPlain[]): string {
  const blocks: string[] = [];
  for (const w of weeks) {
    const rangeLabel = formatWeekRangeLabelJa(w.weekStartKey);
    const lines: string[] = [
      `【週の範囲】${w.weekStartKey}（${rangeLabel}）`,
      '今週の行動',
      '　◇行動目標：何を実行する（1文で）',
      `　　${nz(w.thisWeekActionGoalText)}`,
      '　◇行動内容：どのように',
      `　　${nz(w.thisWeekActionContentText)}`,
      '今週の振り返り',
      '　◇行動面',
      '　　・行動の振り返り',
      `　　${nz(w.weeklyActionReviewText)}`,
      '　◇成果面',
      '　　・振り返り',
      `　　${nz(w.weeklyOutcomeReviewText)}`,
      '　◇心理面',
      `　　${nz(w.weeklyPsychologyText)}`,
      '　◇気づき・学び・成長',
      `　　${nz(w.insightAndLearningText)}`,
      '　◇課題と原因の深掘り',
      `　　${nz(w.weeklyIssueRootCauseText)}`,
      '　◇来週への改善点',
      `　　${nz(w.nextWeekImprovementText)}`,
      '　◇今週の自分へのねぎらいの言葉',
      `　　${nz(w.weeklySelfPraiseText)}`,
    ];
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}
