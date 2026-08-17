import type { JournalMonthlyPlain } from '@/lib/firestore';
import { WEEKLY_IMPROVEMENT_MIN_TOTAL_CHARS } from '@/lib/weeklyImprovementAi';

/** 週次と同値（参照本文の合計最小。特記事項は任意だが入力があれば合計に含む） */
export const MONTHLY_IMPROVEMENT_MIN_TOTAL_CHARS = WEEKLY_IMPROVEMENT_MIN_TOTAL_CHARS;

/** @deprecated 互換エイリアス。合計下限 {@link MONTHLY_IMPROVEMENT_MIN_TOTAL_CHARS} を使うこと */
export const MONTHLY_IMPROVEMENT_MIN_CHARS_PER_FIELD = MONTHLY_IMPROVEMENT_MIN_TOTAL_CHARS;

export type MonthlyImprovementInputSectionDef = {
  promptLabel: string;
  labelShort: string;
  getValue: (d: JournalMonthlyPlain) => string | null;
  firestorePlain: string;
  firestoreEncrypted: string;
  /** true のとき任意欄（空でも合計検証の必須にはしないが、入力があれば合計に含む） */
  optional?: boolean;
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
    optional: true,
  },
];

export function countMonthlyImprovementInputChars(text: string): number {
  return [...text].length;
}

export function countMonthlyImprovementInputTotalChars(data: JournalMonthlyPlain): number {
  let total = 0;
  for (const sec of MONTHLY_IMPROVEMENT_INPUT_SECTIONS) {
    total += countMonthlyImprovementInputChars((sec.getValue(data) ?? '').trim());
  }
  return total;
}

export function validateMonthlyImprovementInput(data: JournalMonthlyPlain): {
  ok: boolean;
  totalChars: number;
  shortLabels: string[];
} {
  const totalChars = countMonthlyImprovementInputTotalChars(data);
  return {
    ok: totalChars >= MONTHLY_IMPROVEMENT_MIN_TOTAL_CHARS,
    totalChars,
    shortLabels: [],
  };
}

/** 非空の参照項目のみ連結（特記事項も入力があれば含む） */
export function buildMonthlyImprovementInputText(data: JournalMonthlyPlain): string {
  const lines: string[] = [];
  for (const sec of MONTHLY_IMPROVEMENT_INPUT_SECTIONS) {
    const t = (sec.getValue(data) ?? '').trim();
    if (!t) continue;
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
