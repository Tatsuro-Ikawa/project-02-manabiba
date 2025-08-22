import { User } from 'firebase/auth';

// ユーザーロール定義
export type UserRole = 'user' | 'coach' | 'senior_coach' | 'admin';

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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
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