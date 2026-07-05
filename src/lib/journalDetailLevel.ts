/**
 * 気づきノート（朝・晩／週／月）の入力表示レベル。
 * 仕様の正本: docs/manabiba_01/04_TRIAL_28_IMPLEMENTATION_DECISIONS.md §4.y（週・月・朝）、§4.z（晩）
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

/** 朝：今日の行動のイメージング（§4.z — 詳細のみ） */
export function journalShowMorningImaging(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 晩：1.a どのように行動できましたか（§4.z — 詳細のみ） */
export function journalShowEveningSpecificActions(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 晩：4 その時、どんな気持ちになりましたか（§4.z — 普通以上） */
export function journalShowEveningEmotionThought(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：5 その時、どのような考えが思い浮かびましたか（§4.z — 普通以上） */
export function journalShowEveningReflectionThought(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：6 そこから、なにか気づくことはありましたか（§4.z — 普通以上） */
export function journalShowEveningInsightFollowUp(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：8 今日の学びをどう明日に活かしますか（§4.z — 全レベル） */
export function journalShowEveningImprovement(_level: JournalDetailLevel): boolean {
  return true;
}

/** 晩：9〜10 Aiコーチ（質問・応答）（§4.z — 普通以上） */
export function journalShowEveningAiCoach(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 晩：13 明日の行動内容（§4.z — 詳細のみ） */
export function journalShowEveningTomorrowActionContent(level: JournalDetailLevel): boolean {
  return level === 'detailed';
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

/** 週：今週の行動「行動内容：どのように」（簡易では非表示） */
export function journalShowWeeklyThisWeekActionContent(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：Aiレポート作成ブロック（簡易では非表示） */
export function journalShowWeeklyAiReportSection(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：行動の振り返りテキスト（簡易では非表示） */
export function journalShowWeeklyActionReviewText(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：成果への振り返りテキスト（簡易では非表示） */
export function journalShowWeeklyOutcomeReview(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：指標の達成度（詳細のみ） */
export function journalShowWeeklyMetricAchievement(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 週：課題と原因の深掘り（詳細のみ） */
export function journalShowWeeklyIssueRootCauseSection(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 週：来週への改善点セクション（簡易では非表示） */
export function journalShowWeeklyNextImprovementSection(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：Ai改善提案欄（詳細のみ） */
export function journalShowWeeklyAiImprovementSuggestion(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 週：来週の行動「行動内容（具体的に）」（簡易では非表示） */
export function journalShowWeeklyNextWeekActionContent(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 週：他に残しておきたいこと（詳細のみ） */
export function journalShowWeeklySelfPraiseSection(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 月：今月の行動「行動内容：どのように」（簡易では非表示） */
export function journalShowMonthlyThisMonthActionContent(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：Aiレポート作成ブロック（簡易では非表示） */
export function journalShowMonthlyAiReportSection(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：行動の振り返りテキスト（簡易では非表示） */
export function journalShowMonthlyActionReviewText(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：成果への振り返りテキスト（簡易では非表示） */
export function journalShowMonthlyOutcomeReview(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：指標の達成度（詳細のみ） */
export function journalShowMonthlyMetricAchievement(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 月：心理面（簡易・普通・詳細） */
export function journalShowMonthlyPsychologySection(_level: JournalDetailLevel): boolean {
  return true;
}

/** 月：気づき・学び・成長（簡易・普通・詳細） */
export function journalShowMonthlyInsightLearning(_level: JournalDetailLevel): boolean {
  return true;
}

/** 月：課題と原因の深掘り（詳細のみ） */
export function journalShowMonthlyIssueRootCauseSection(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 月：来月への改善点セクション（簡易では非表示） */
export function journalShowMonthlyNextImprovementSection(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：Ai改善提案欄（詳細のみ） */
export function journalShowMonthlyAiImprovementSuggestion(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}

/** 月：来月の行動「目標（一文で）」（全レベル） */
export function journalShowMonthlyNextMonthGoal(_level: JournalDetailLevel): boolean {
  return true;
}

/** 月：来月の行動「行動内容（具体的に）」（簡易では非表示） */
export function journalShowMonthlyNextMonthActionContent(level: JournalDetailLevel): boolean {
  return level !== 'simple';
}

/** 月：特記事項（その他自由欄）（詳細のみ） */
export function journalShowMonthlySpecialNotes(level: JournalDetailLevel): boolean {
  return level === 'detailed';
}
