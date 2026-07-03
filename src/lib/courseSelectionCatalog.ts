/** コース変更・選択画面の機能一覧表（外部仕様・ランディング整合） */
export type CoursePlanKey = 'free' | 'standard' | 'premium';

/** ○ / ○* / ○○ / — */
export type FeatureMark = 'yes' | 'yesFootnote' | 'yesDouble' | 'no';

export type CourseFeatureRow = {
  label: string;
  indent?: boolean;
  free: FeatureMark;
  standard: FeatureMark;
  premium: FeatureMark;
};

export const COURSE_PLAN_LABELS: Record<CoursePlanKey, string> = {
  free: 'フリー',
  standard: 'スタンダード',
  premium: 'プレミアム',
};

export const COURSE_FEATURE_SECTIONS: { heading?: string; rows: CourseFeatureRow[] }[] = [
  {
    rows: [{ label: 'ホーム画面→情報提供サービス', free: 'yesFootnote', standard: 'yes', premium: 'yes' }],
  },
  {
    rows: [{ label: '7日間スタートプログラム（開発中）', free: 'yes', standard: 'yes', premium: 'yes' }],
  },
  {
    heading: 'マネジメント日誌（気づきノート）機能',
    rows: [
      { label: '行動宣言', indent: true, free: 'no', standard: 'yes', premium: 'yes' },
      { label: '朝・晩→AIコメント', indent: true, free: 'no', standard: 'yes', premium: 'yes' },
      { label: '週→AIレポート＆AI改善提案', indent: true, free: 'no', standard: 'yes', premium: 'yes' },
      { label: '月→AIレポート＆AI改善提案', indent: true, free: 'no', standard: 'yes', premium: 'yes' },
      { label: '28日間トライアル', indent: true, free: 'no', standard: 'yes', premium: 'yes' },
    ],
  },
  {
    rows: [{ label: 'コーチ面談サービス（Zoom）', free: 'no', standard: 'no', premium: 'yes' }],
  },
  {
    heading: 'コミュニケーション機能',
    rows: [
      { label: '学び日記共有', indent: true, free: 'no', standard: 'no', premium: 'yesDouble' },
      { label: 'Q&Aメッセージボード', indent: true, free: 'no', standard: 'no', premium: 'yesDouble' },
    ],
  },
];

export function featureMarkToDisplay(mark: FeatureMark): string {
  if (mark === 'yes') return '○';
  if (mark === 'yesFootnote') return '○*';
  if (mark === 'yesDouble') return '○○';
  return '—';
}

/** 表示用定価（ランディングの打ち消し線と整合） */
export const COURSE_LIST_PRICING = {
  standard: {
    listMonthly: 1650,
    listYearly: 15840,
    listYearlyPerMonth: 1320,
  },
  premium: {
    listMonthly: 6600,
  },
} as const;

export const OPEN_PERIOD_PRICE_NOTE = '(オープン期間(2026年末)限定価格)';

export const DATA_RETENTION_DAYS = 90;

export const DATA_RETENTION_MSG =
  'コースを変更すると、不要になったデータは90日間保存した後、削除されます。';

/** ダウングレード時に 28日お試しを終了する旨（confirm 用） */
export const TRIAL_ENDS_ON_DOWNGRADE_MSG =
  '28日お試し期間は終了し、気づきノート（有料機能）はご利用いただけなくなります。';

export function buildFreeDowngradeConfirmMessage(trialActive: boolean): string {
  const trialNotice = trialActive ? `\n\n${TRIAL_ENDS_ON_DOWNGRADE_MSG}` : '';
  return `${DATA_RETENTION_MSG}${trialNotice}\n\nフリーコースへ変更しますか？（デモ）`;
}

export function buildStandardDowngradeConfirmMessage(_trialActive: boolean): string {
  const mbNotice =
    '\n\nメッセージボードの新規投稿・編集は終了します。履歴は90日間閲覧できます。';
  return `${DATA_RETENTION_MSG}${mbNotice}\n\nスタンダードコースへ変更しますか？（デモ）`;
}
