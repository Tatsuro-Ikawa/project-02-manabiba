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
