import { User } from 'firebase/auth';

// ユーザーロール定義
export type UserRole = 'user' | 'coach' | 'senior_coach' | 'admin';

/** マネジメント日誌の週の開始曜日（未設定時は月曜） */
export type JournalWeekStartsOn = 'monday' | 'sunday';
export type WeeklyAiReportWriteMode = 'overwrite' | 'append';

// サブスクリプションプラン定義
export type SubscriptionPlan = 'free' | 'standard' | 'premium';

// ユーザープロファイル拡張
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  subscription: SubscriptionInfo;
  /** 利用規約・プライバシーポリシー同意（初回ログイン時に必須） */
  consents?: UserConsents;
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
  /** 週次 AI レポート作成時、既存入力への反映方式（未設定時は append） */
  weeklyAiReportWriteMode?: WeeklyAiReportWriteMode;
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
}

// サブスクリプション情報
export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
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