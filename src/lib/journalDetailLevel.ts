/**
 * 学び帳（朝・晩／週／月）の入力表示レベル。
 * 区分一覧（簡易・普通・詳細）はプロダクト仕様に準拠。
 */

export type JournalDetailLevel = 'simple' | 'normal' | 'detailed';

export const JOURNAL_DETAIL_LEVEL_STORAGE_KEY = 'manabiba:journal-detail-level';
export const JOURNAL_DETAIL_LEVEL_DEFAULT_STORAGE_KEY = 'manabiba:journal-detail-level-default';

export const JOURNAL_DETAIL_LEVEL_LABELS: Record<JournalDetailLevel, string> = {
  simple: '簡易',
  normal: '普通',
  detailed: '詳細',
};

export function parseJournalDetailLevel(raw: string | null | undefined): JournalDetailLevel {
  if (raw === 'simple' || raw === 'normal' || raw === 'detailed') return raw;
  return 'normal';
}

export function readJournalDetailLevelFromStorage(): JournalDetailLevel {
  if (typeof window === 'undefined') return 'normal';
  try {
    const current = window.localStorage.getItem(JOURNAL_DETAIL_LEVEL_STORAGE_KEY);
    if (current) return parseJournalDetailLevel(current);
    const def = window.localStorage.getItem(JOURNAL_DETAIL_LEVEL_DEFAULT_STORAGE_KEY);
    return parseJournalDetailLevel(def);
  } catch {
    return 'normal';
  }
}

export function writeJournalDetailLevelToStorage(level: JournalDetailLevel): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(JOURNAL_DETAIL_LEVEL_STORAGE_KEY, level);
  } catch {
    /* ignore */
  }
}

export function writeJournalDetailLevelDefaultToStorage(level: JournalDetailLevel): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(JOURNAL_DETAIL_LEVEL_DEFAULT_STORAGE_KEY, level);
    window.localStorage.setItem(JOURNAL_DETAIL_LEVEL_STORAGE_KEY, level);
  } catch {
    /* ignore */
  }
}

/** 朝：行動内容（どのように） */
export function journalShowMorningActionContent(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 朝：今日の行動のイメージング */
export function journalShowMorningImaging(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：実行状況に応じた「具体的な行動内容」 */
export function journalShowEveningSpecificActions(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：行動の結果の自由記述2項目 */
export function journalShowEveningResultDetailTexts(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 晩：行動時の感情・思考（自由記述） */
export function journalShowEveningEmotionThought(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：どんなブレーキが働いたか */
export function journalShowEveningBrakeWhat(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 晩：反論できたか */
export function journalShowEveningBrakeRebutted(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：どんな反論の言葉を使ったか */
export function journalShowEveningBrakeWords(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 晩：明日への改善点・Aiコーチからのコメント（簡易では非表示＝AIも利用不可で詳細入力を促す） */
export function journalShowEveningImprovement(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：明日の行動 — 行動内容 */
export function journalShowEveningTomorrowActionContent(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：明日の行動のイメージング */
export function journalShowEveningTomorrowImaging(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 晩：ねぎらいの言葉 */
export function journalShowEveningSelfMessage(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 補足折りたたみ（朝の目標・晩の結果など） */
export function journalShowSupplementaryDetails(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：満足度チャート（平均テキストは常に表示） */
export function journalShowWeeklySatisfactionChart(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：行動内容と成果 */
export function journalShowWeeklyActionContentAndOutcome(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：行動時の思考・感情 */
export function journalShowWeeklyEmotionAndThought(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：改善まとめ */
export function journalShowWeeklyImprovementSummary(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 週：来週の行動目標 */
export function journalShowWeeklyNextWeekGoal(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：今月成果目標 */
export function journalShowMonthlyOutcomeGoal(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：今月行動目標 */
export function journalShowMonthlyActionGoal(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：行動概要と成果達成状況 */
export function journalShowMonthlyActionSummary(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 月：改善点 */
export function journalShowMonthlyImprovementPoints(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：来月の行動目標 */
export function journalShowMonthlyNextMonthGoal(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}
