/** 特定商取引法ページと整合するデモ用事業者情報（申込画面表示） */
export const DEMO_MERCHANT = {
  businessName: 'ビズアイテム',
  representative: '代表　井川竜朗',
  address: '岐阜県各務原市川島緑町4-3',
  phone: '090-1473-6021',
  phoneHours: '月曜日〜金曜日　9:30〜17:00',
  email: 'bizitems.567@gmail.com',
} as const;

export const DEMO_PLAN_PRICING = {
  standard: {
    label: '気づきノート　スタンダードコース（AIコーチ）',
    openPriceMonthly: 1320,
    openPriceYearly: 11760,
    openPriceNote: 'オープン期間限定（2026年12月31日まで）',
    trialDays: 28,
  },
  premium: {
    label: '気づきノート　プレミアムコース（プライベートコーチ）',
    openPriceMonthly: 3300,
    openPriceNote: 'オープン期間限定（2026年12月31日まで）',
    trialDays: 28,
    sessionNote: '60分セッション/月（追加 6,600円/60分）',
  },
} as const;

export type ApplyPlan = keyof typeof DEMO_PLAN_PRICING;
