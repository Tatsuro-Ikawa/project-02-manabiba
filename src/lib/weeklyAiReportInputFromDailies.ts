import type { Trial4wDailyPlain } from '@/lib/firestore';

function hasText(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function nz(v: string | null | undefined): string {
  return hasText(v) ? v.trim() : '無し';
}

function executionLabel(v: Trial4wDailyPlain['eveningExecution']): string {
  if (v === 'done') return 'できた';
  if (v === 'partial') return '一部できた';
  if (v === 'none') return 'できなかった';
  return '無し';
}

function brakeLabel(v: Trial4wDailyPlain['eveningBrake']): string {
  if (v === 'yes') return '働いた';
  if (v === 'partial') return '一部働いた';
  if (v === 'no') return '働かなかった';
  return '無し';
}

/**
 * 週次 Aiレポート用インプット：当該週の各日について朝・晩の項目を連結する。
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
    lines.push(`- 行動目標: ${nz(d?.morningActionGoalText)}`);
    lines.push(`- 行動内容: ${nz(d?.morningActionContentText)}`);

    lines.push('【行動の実行状況】', `- 実行状況: ${executionLabel(d?.eveningExecution ?? null)}`);

    lines.push('【行動の結果】');
    lines.push(`- どのように行いどの程度できたか: ${nz(d?.eveningResultExecutionText)}`);
    lines.push(`- 目標・指標に対しどの程度近づけたか: ${nz(d?.eveningResultGoalProgressText)}`);
    lines.push(
      `- 満足度: ${
        d && typeof d.eveningSatisfaction === 'number' && !Number.isNaN(d.eveningSatisfaction)
          ? `${d.eveningSatisfaction}/10`
          : '無し'
      }`
    );

    lines.push('【行動時の感情・思考】', `- 内容: ${nz(d?.eveningEmotionThoughtText)}`);

    const brake = brakeLabel(d?.eveningBrake ?? null);
    const brakeLines = [`- 作動: ${brake}`];
    if (d?.eveningBrake === 'yes' || d?.eveningBrake === 'partial') {
      brakeLines.push(`- どんなブレーキだったか: ${nz(d?.eveningBrakeWorkedText)}`);
      brakeLines.push(`- どんな反論の言葉を使ったか: ${nz(d?.eveningBrakeWordsText)}`);
    }
    lines.push('【こころのブレーキ】', ...brakeLines);

    lines.push('【今日の気づき・感動・学びと課題】', `- 内容: ${nz(d?.eveningInsightText)}`);
    lines.push('【明日への改善点】', `- 内容: ${nz(d?.eveningImprovementText)}`);

    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}
