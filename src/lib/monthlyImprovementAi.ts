import type { JournalMonthlyPlain } from '@/lib/firestore';

/** 週次 {@link WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD} と同値（各欄の最小文字数。特記事項は別） */
export const MONTHLY_IMPROVEMENT_MIN_CHARS_PER_FIELD = 10;

export type MonthlyImprovementInputSectionDef = {
  promptLabel: string;
  labelShort: string;
  getValue: (d: JournalMonthlyPlain) => string | null;
  firestorePlain: string;
  firestoreEncrypted: string;
  /** 0 のとき API の「各欄 N 文字以上」検証をスキップ（特記事項は任意） */
  minChars?: number;
};

/** プロンプト連結・API 検証で使う参照ブロック定義（順序固定） */
export const MONTHLY_IMPROVEMENT_INPUT_SECTIONS: readonly MonthlyImprovementInputSectionDef[] = [
  {
    promptLabel: '行動目標',
    labelShort: '行動目標',
    getValue: (d: JournalMonthlyPlain) => d.thisMonthActionGoalText,
    firestorePlain: 'thisMonthActionGoalText',
    firestoreEncrypted: 'thisMonthActionGoalTextEncrypted',
  },
  {
    promptLabel: '行動内容',
    labelShort: '行動内容',
    getValue: (d: JournalMonthlyPlain) => d.thisMonthActionContentText,
    firestorePlain: 'thisMonthActionContentText',
    firestoreEncrypted: 'thisMonthActionContentTextEncrypted',
  },
  {
    promptLabel: '行動の振り返り',
    labelShort: '行動の振り返り',
    getValue: (d: JournalMonthlyPlain) => d.monthlyActionReviewText,
    firestorePlain: 'monthlyActionReviewText',
    firestoreEncrypted: 'monthlyActionReviewTextEncrypted',
  },
  {
    promptLabel: '成果の振り返り',
    labelShort: '成果の振り返り',
    getValue: (d: JournalMonthlyPlain) => d.monthlyOutcomeReviewText,
    firestorePlain: 'monthlyOutcomeReviewText',
    firestoreEncrypted: 'monthlyOutcomeReviewTextEncrypted',
  },
  {
    promptLabel: '心理面　行動時の思考・感情の変化',
    labelShort: '心理面（行動時の思考・感情の変化）',
    getValue: (d: JournalMonthlyPlain) => d.monthlyPsychologyText,
    firestorePlain: 'monthlyPsychologyText',
    firestoreEncrypted: 'monthlyPsychologyTextEncrypted',
  },
  {
    promptLabel: '気づき・学び・成長',
    labelShort: '気づき・学び・成長',
    getValue: (d: JournalMonthlyPlain) => d.insightAndLearningText,
    firestorePlain: 'insightAndLearningText',
    firestoreEncrypted: 'insightAndLearningTextEncrypted',
  },
  {
    promptLabel: '課題と原因の深掘り',
    labelShort: '課題と原因の深掘り',
    getValue: (d: JournalMonthlyPlain) => d.monthlyIssueRootCauseText,
    firestorePlain: 'monthlyIssueRootCauseText',
    firestoreEncrypted: 'monthlyIssueRootCauseTextEncrypted',
  },
  {
    promptLabel: '来月への改善点',
    labelShort: '来月への改善点',
    getValue: (d: JournalMonthlyPlain) => d.nextMonthImprovementText,
    firestorePlain: 'nextMonthImprovementText',
    firestoreEncrypted: 'nextMonthImprovementTextEncrypted',
  },
  {
    promptLabel: '特記事項（その他自由欄）',
    labelShort: '特記事項',
    getValue: (d: JournalMonthlyPlain) => d.monthlySpecialNotesText,
    firestorePlain: 'monthlySpecialNotesText',
    firestoreEncrypted: 'monthlySpecialNotesTextEncrypted',
    minChars: 0,
  },
];

export function countMonthlyImprovementInputChars(text: string): number {
  return [...text].length;
}

export function validateMonthlyImprovementInput(data: JournalMonthlyPlain): {
  ok: boolean;
  shortLabels: string[];
} {
  const shortLabels: string[] = [];
  for (const sec of MONTHLY_IMPROVEMENT_INPUT_SECTIONS) {
    const min = sec.minChars ?? MONTHLY_IMPROVEMENT_MIN_CHARS_PER_FIELD;
    if (min <= 0) continue;
    const v = (sec.getValue(data) ?? '').trim();
    if (countMonthlyImprovementInputChars(v) < min) {
      shortLabels.push(sec.labelShort);
    }
  }
  return { ok: shortLabels.length === 0, shortLabels };
}

export function buildMonthlyImprovementInputText(data: JournalMonthlyPlain): string {
  const lines: string[] = [];
  for (const sec of MONTHLY_IMPROVEMENT_INPUT_SECTIONS) {
    const t = (sec.getValue(data) ?? '').trim();
    lines.push(`【${sec.promptLabel}】`, t);
  }
  return lines.join('\n');
}

export function extractMonthlyImprovementSectionBody(full: string, sectionTitle: string): string {
  const marker = `【${sectionTitle}】`;
  const i = full.indexOf(marker);
  if (i < 0) return '';
  let rest = full.slice(i + marker.length).replace(/^\n+/, '');
  const nextIdx = rest.search(/\n【/);
  if (nextIdx >= 0) rest = rest.slice(0, nextIdx);
  return rest.trim();
}
