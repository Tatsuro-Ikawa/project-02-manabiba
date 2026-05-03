import type { JournalWeeklyPlain } from '@/lib/firestore';

/**
 * 週次 Ai 改善提案の参照項目ごとの最小文字数（Unicode コードポイント）。
 * 朝・晩の「連結10文字以上」とは別に、各欄に一定の情報量があることを求める（案B）。
 */
export const WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD = 10;

/** プロンプト連結・API 検証で使う参照ブロック定義（順序固定） */
export const WEEKLY_IMPROVEMENT_INPUT_SECTIONS = [
  {
    promptLabel: '行動目標',
    labelShort: '行動目標',
    getValue: (d: JournalWeeklyPlain) => d.thisWeekActionGoalText,
    firestorePlain: 'thisWeekActionGoalText',
    firestoreEncrypted: 'thisWeekActionGoalTextEncrypted',
  },
  {
    promptLabel: '行動内容',
    labelShort: '行動内容',
    getValue: (d: JournalWeeklyPlain) => d.thisWeekActionContentText,
    firestorePlain: 'thisWeekActionContentText',
    firestoreEncrypted: 'thisWeekActionContentTextEncrypted',
  },
  {
    promptLabel: '行動の振り返り',
    labelShort: '行動の振り返り',
    getValue: (d: JournalWeeklyPlain) => d.weeklyActionReviewText,
    firestorePlain: 'weeklyActionReviewText',
    firestoreEncrypted: 'weeklyActionReviewTextEncrypted',
  },
  {
    promptLabel: '成果の振り返り',
    labelShort: '成果の振り返り',
    getValue: (d: JournalWeeklyPlain) => d.weeklyOutcomeReviewText,
    firestorePlain: 'weeklyOutcomeReviewText',
    firestoreEncrypted: 'weeklyOutcomeReviewTextEncrypted',
  },
  {
    promptLabel: '心理面　行動時の思考・感情の変化',
    labelShort: '心理面（行動時の思考・感情の変化）',
    getValue: (d: JournalWeeklyPlain) => d.weeklyPsychologyText,
    firestorePlain: 'weeklyPsychologyText',
    firestoreEncrypted: 'weeklyPsychologyTextEncrypted',
  },
  {
    promptLabel: '気づき・学び・成長',
    labelShort: '気づき・学び・成長',
    getValue: (d: JournalWeeklyPlain) => d.insightAndLearningText,
    firestorePlain: 'insightAndLearningText',
    firestoreEncrypted: 'insightAndLearningTextEncrypted',
  },
  {
    promptLabel: '課題と原因の深掘り',
    labelShort: '課題と原因の深掘り',
    getValue: (d: JournalWeeklyPlain) => d.weeklyIssueRootCauseText,
    firestorePlain: 'weeklyIssueRootCauseText',
    firestoreEncrypted: 'weeklyIssueRootCauseTextEncrypted',
  },
  {
    promptLabel: '来週への改善点',
    labelShort: '来週への改善点',
    getValue: (d: JournalWeeklyPlain) => d.nextWeekImprovementText,
    firestorePlain: 'nextWeekImprovementText',
    firestoreEncrypted: 'nextWeekImprovementTextEncrypted',
  },
] as const;

export function countWeeklyImprovementInputChars(text: string): number {
  return [...text].length;
}

/** 各参照項目が {@link WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD} 文字以上か検証 */
export function validateWeeklyImprovementInput(data: JournalWeeklyPlain): {
  ok: boolean;
  shortLabels: string[];
} {
  const shortLabels: string[] = [];
  for (const sec of WEEKLY_IMPROVEMENT_INPUT_SECTIONS) {
    const v = (sec.getValue(data) ?? '').trim();
    if (countWeeklyImprovementInputChars(v) < WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD) {
      shortLabels.push(sec.labelShort);
    }
  }
  return { ok: shortLabels.length === 0, shortLabels };
}

/** 週次 Ai 改善提案 API 用：参照8項目を【ラベル】＋本文の固定順で連結（検証済み想定） */
export function buildWeeklyImprovementInputText(data: JournalWeeklyPlain): string {
  const lines: string[] = [];
  for (const sec of WEEKLY_IMPROVEMENT_INPUT_SECTIONS) {
    const t = (sec.getValue(data) ?? '').trim();
    lines.push(`【${sec.promptLabel}】`, t);
  }
  return lines.join('\n');
}

/** 連結テキストから `【タイトル】` ブロックの本文を取り出す（次の `【` 手前まで） */
export function extractWeeklyImprovementSectionBody(full: string, sectionTitle: string): string {
  const marker = `【${sectionTitle}】`;
  const i = full.indexOf(marker);
  if (i < 0) return '';
  let rest = full.slice(i + marker.length).replace(/^\n+/, '');
  const nextIdx = rest.search(/\n【/);
  if (nextIdx >= 0) rest = rest.slice(0, nextIdx);
  return rest.trim();
}
