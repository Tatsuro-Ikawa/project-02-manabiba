import type { Trial4wDailyPlain } from '@/lib/firestore';

function hasText(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function nz(v: string | null | undefined): string {
  return hasText(v) ? v.trim() : '無し';
}

function eveningExecutionLabel(v: Trial4wDailyPlain['eveningExecution']): string {
  if (v === 'done') return 'およそできた';
  if (v === 'partial') return 'まあまあできた';
  if (v === 'none') return 'あまりできなかった';
  return '無し';
}

function morningActionGoal(d: Trial4wDailyPlain | undefined): string {
  return nz(d?.morningActionGoalText ?? d?.morningTodayActionText);
}

function eveningTomorrowGoal(d: Trial4wDailyPlain | undefined): string {
  return nz(d?.eveningTomorrowGoalText ?? d?.eveningTomorrowActionSeedText);
}

/**
 * 週次 Aiレポート用インプット：当該週の各日について朝・晩の項目を連結する。
 * 構造は 04_VERTEX_AI_TRIAL_IMPROVEMENT.md §11.0.3（§4.z 晩 UI 改訂に準拠）。
 * 値が無い項目は「無し」とする（全日分を出力し、文字数下限の安定化に寄与する）。
 */
export function buildWeeklyAiReportInputFromDailies(
  weekDates: string[],
  todayKey: string,
  dailyByDateKey: Record<string, Trial4wDailyPlain>
): string {
  const blocks: string[] = [];
  for (const dk of weekDates) {
    if (dk > todayKey) continue;
    const d = dailyByDateKey[dk];
    const lines: string[] = [`【日付】${dk}`];

    lines.push('【今日の行動】');
    lines.push(`- 行動目標: ${morningActionGoal(d)}`);
    lines.push(`- 行動内容: ${nz(d?.morningActionContentText)}`);

    lines.push('【行動】');
    lines.push(
      `- 行動目標に対してどのくらい実施できましたか？: ${eveningExecutionLabel(d?.eveningExecution ?? null)}`
    );
    lines.push(`- どのように行動できましたか？: ${nz(d?.eveningSpecificActionsText)}`);
    lines.push(
      `- 行動の満足度を10点のうちどのくらいでしたか？: ${
        d && typeof d.eveningSatisfaction === 'number' && !Number.isNaN(d.eveningSatisfaction)
          ? `${d.eveningSatisfaction}/10`
          : '無し'
      }`
    );

    lines.push('【気づき】');
    lines.push(`- 今日印象に残ったできごとは何でしたか？: ${nz(d?.eveningResultExecutionText)}`);
    lines.push(`- その時、どんな気持ちになりましたか？: ${nz(d?.eveningEmotionThoughtText)}`);
    lines.push(`- その時、どのような考えが思い浮かびましたか？: ${nz(d?.eveningReflectionThoughtText)}`);
    lines.push(`- そこから、なにか気づくことはありましたか？: ${nz(d?.eveningBrakeWorkedText)}`);
    lines.push(`- この出来事から何を学びましたか？: ${nz(d?.eveningInsightText)}`);
    lines.push(`- 今日の学びをどう明日に活かしますか？: ${nz(d?.eveningImprovementText)}`);

    lines.push('【明日の行動】');
    lines.push(`- 明日の行動目標: ${eveningTomorrowGoal(d)}`);
    lines.push(`- 明日の行動内容: ${nz(d?.eveningTomorrowActionContentText)}`);

    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}
