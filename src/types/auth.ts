import { User } from 'firebase/auth';

// ユーザーロール定義
export type UserRole = 'user' | 'coach' | 'senior_coach' | 'admin';

/** マネジメント日誌の週の開始曜日（未設定時は月曜） */
export type JournalWeekStartsOn = 'monday' | 'sunday';
/**
 * 週・月の学び帳「Aiレポート作成」で既存入力に生成結果を載せる方式。
 * - `overwrite`: 常に生成結果で置き換え
 * - `append`: 既に文字がある欄は末尾に追記（区切り付き）
 * - `skip_if_nonempty`: 既に文字がある欄は変更しない。空欄のみ生成結果を入れる
 */
export type WeeklyAiReportWriteMode = 'overwrite' | 'append' | 'skip_if_nonempty';

// サブスクリプションプラン定義
export type SubscriptionPlan = 'free' | 'standard' | 'premium';

/** ランディング等で最初に選んだプログラム（`users/{uid}.enrollment.primaryCourse`） */
export type PrimaryCourse = 'start7d' | 'kizuki';

export interface UserEnrollment {
  primaryCourse?: PrimaryCourse | null;
}

// ユーザープロファイル拡張
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  subscription: SubscriptionInfo;
  /** 利用規約・プライバシーポリシー同意（初回・フリー会員含む。7日間／気づきノートは規約内の章で読み分け） */
  consents?: UserConsents;
  /** コース選択（7日間のみ / 気づきノート）。未設定時は従来どおり気づきノート導線を許可 */
  enrollment?: UserEnrollment;
  /** アファメーションタブの前回選択・サブメニュー（Firestore。localStorage は使わない） */
  trialAffirmationMeta?: TrialAffirmationUiMeta;
  /** A-11: コーチング実施中のテーマ（`users/{uid}/affirmations/{id}`） */
  activeCoachingAffirmationId?: string | null;
  /** A-11: 暦月あたりの「コーチへ送信」上限（サブスク由来。未設定時はプランから解決） */
  coachShareQuotaPerMonth?: number;
  /** A-11: 集計中の暦月キー（例: Asia/Tokyo 基準 `YYYY-MM`） */
  coachShareMonthKey?: string | null;
  /** A-11: `coachShareMonthKey` の月に消費した送信回数 */
  coachShareUsedThisMonth?: number;
  /** マネジメント日誌の週の開始（未設定・`monday` は月曜始まり。`sunday` のときのみ保存してもよい） */
  weekStartsOn?: JournalWeekStartsOn;
  /**
   * 学び帳の Aiレポート作成（週・月共通）における、既存入力への反映方式（未設定時は append）。
   * Firestore キー名は `weeklyAiReportWriteMode` のまま（月次 UI からも同値を参照）。
   */
  weeklyAiReportWriteMode?: WeeklyAiReportWriteMode;
  /**
   * 日・週・月の「コーチと共有」チェックの初期値（未作成ドキュメントを開いたとき）。
   * 未設定・false = なし（製品デフォルト）。既存ドキュメントは変更しない。
   */
  journalCoachShareDefaultOn?: boolean;
  /**
   * アファメーション発行時の「コーチと共有」初期値。
   * 未設定・false = なし。既存テーマは変更しない。
   */
  affirmationCoachShareDefaultOn?: boolean;
  /** デモ申込フォームで登録したお客様情報（コース復帰時に表示・更新） */
  applyBilling?: ApplyBillingInfo;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface UserConsents {
  termsVersion: string; // YYYY-MM-DD
  privacyVersion: string; // YYYY-MM-DD
  acceptedAt: Date;
}

/** 28日間トライアル・アファメーションの UI 状態（`users/{uid}.trialAffirmationMeta`） */
export type TrialAffirmationSubmenu = 'select' | 'create' | 'edit' | 'history';

export interface TrialAffirmationUiMeta {
  /** 一覧で最後に選んだ `affirmations/{affirmationId}` の ID。未選択は null */
  lastSelectedAffirmationId: string | null;
  /**
   * 前回開いていたサブメニュー。null = プレビューのみ表示（骨格初期状態）
   */
  lastSubmenu: TrialAffirmationSubmenu | null;
  /**
   * 発行済み本文の編集モーダルで右側プレビューを出すか。
   * 未設定時は `true`（表示する）。
   */
  showEditPreview?: boolean;
}

/** デモ申込フォームのお客様情報（`users/{uid}.applyBilling`） */
export interface ApplyBillingInfo {
  fullName: string;
  postalCode: string;
  address: string;
  phone: string;
  updatedAt?: Date;
}

// サブスクリプション情報
export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  /** `past_due` = Stripe 再請求猶予中（有料機能は継続。C3・A-5） */
  status: 'active' | 'past_due' | 'inactive' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  /** 28 日お試し等の終了日時（JST 起点は運用で `users` 更新側が揃える）。未設定ならトライアル期限なし。 */
  trialEndsAt?: Date;
  /** 解約・ダウングレード起点から90日後のデータ削除予定（04_SUBSCRIPTION_PRODUCT_SCOPE §3.2） */
  dataRetentionEndsAt?: Date;
  /** 28日お試しを一度消費した日時（再付与なし判定） */
  trialConsumedAt?: Date;
  /**
   * Stripe Subscription の現在請求期間終了（`current_period_end` のミラー）。
   * 解約予約中でも期間内は有効権限に使う想定（設計: 04_SUBSCRIPTION_PRODUCT_SCOPE 付録 C）。
   */
  currentPeriodEnd?: Date;
  /** Stripe Customer ID（`cus_...`）。決済連携時に Webhook 等で設定。 */
  stripeCustomerId?: string | null;
  /** Stripe Subscription ID（`sub_...`）。 */
  stripeSubscriptionId?: string | null;
  features: FeatureAccess;
  usage: UsageLimits;
}

// 機能アクセス権限
export interface FeatureAccess {
  pdca: boolean;
  aiComments: boolean;
  coachComments: boolean;
  zoomMeetings: boolean;
  communityAccess: boolean;
  advancedAnalytics: boolean;
}

// 利用制限
export interface UsageLimits {
  pdcaEntries: number;
  aiComments: number;
  zoomMeetings: number;
  coachSessions: number;
}

// 認証コンテキスト拡張
export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  canUseFeature: (feature: keyof FeatureAccess) => boolean;
  hasRole: (role: UserRole) => boolean;
  getUsageInfo: (feature: keyof UsageLimits) => { current: number; limit: number };
}

export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

// 権限チェック用の型
export interface PermissionCheck {
  feature: keyof FeatureAccess;
  role?: UserRole;
  subscription?: SubscriptionPlan;
} 