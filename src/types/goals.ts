export type GoalCategory = 'career' | 'family' | 'hobby' | 'health' | 'learning' | 'financial' | 'social' | 'other';
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';

export interface Goal {
  id: string;
  uid: string;
  title: string;
  description?: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  targetDate?: Date;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  parentGoalId?: string; // 上位目標への参照
  subGoals?: string[]; // 下位目標のID配列
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface GoalProgress {
  goalId: string;
  date: string;
  progress: number;
  notes?: string;
  createdAt: Date;
}

export const GOAL_CATEGORIES: Record<GoalCategory, string> = {
  career: '仕事・キャリア',
  family: '家庭・家族',
  hobby: '趣味・娯楽',
  health: '健康・運動',
  learning: '学習・スキル',
  financial: '財務・投資',
  social: '人間関係・社会貢献',
  other: 'その他',
};

export const GOAL_TIMEFRAMES: Record<GoalTimeframe, string> = {
  daily: '日単位',
  weekly: '週単位',
  monthly: '月単位',
  yearly: '年単位',
  lifetime: '生涯',
};

// SMART目標の型定義
export type SMARTStep = 'specific' | 'measurable' | 'relevant' | 'timebound' | 'complete';

export interface Milestone {
  id: string;
  title: string;
  targetDate: Date;
  completed: boolean;
}

export interface SMARTGoal {
  id: string;
  uid: string;
  
  // 前プロセスからの引き継ぎ
  themeId?: string;
  themeTitle?: string;
  userType: 'aspiration' | 'problem';
  
  // S: Specific (具体的)
  specificDescription: string;
  
  // M: Measurable (測定可能)
  measurementValue: number;
  measurementUnit: string;
  measurementFrequency: string;
  
  // R: Relevant (関連性)
  relevanceReason: string;
  relatedValues: string[];
  
  // A: Achievable (達成可能) - オプション
  achievableNotes?: string;
  
  // T: Time-bound (期限設定)
  targetDate: Date;
  milestones: Milestone[];
  
  // メタデータ
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled';
  currentStep: SMARTStep;
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export const GOAL_STATUS_LABELS = {
  draft: '下書き',
  active: '進行中',
  completed: '完了',
  paused: '一時停止',
  cancelled: 'キャンセル'
} as const;

export interface SMARTGoalFormData {
  specificDescription: string;
  measurementValue: string;
  measurementUnit: string;
  measurementFrequency: string;
  relevanceReason: string;
  relatedValues: string[];
  targetDate: string;
  milestones: Milestone[];
}

// 測定単位の選択肢
export const MEASUREMENT_UNITS = [
  '点',
  '回',
  '冊',
  'kg',
  'km',
  '時間',
  '分',
  '人',
  '%',
  '個',
  'その他'
] as const;

// 測定頻度の選択肢
export const MEASUREMENT_FREQUENCIES = [
  '毎日',
  '毎週',
  '毎月',
  '四半期ごと',
  '半年ごと',
  '年1回',
  '期限まで'
] as const;

// 価値観タグの選択肢
export const VALUE_TAGS = [
  '家族',
  '健康',
  '成長',
  'キャリア',
  '経済的安定',
  '人間関係',
  '貢献',
  '自由',
  '創造性',
  '学習',
  '達成感',
  '幸福'
] as const;