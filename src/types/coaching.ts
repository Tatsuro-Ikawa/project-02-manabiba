export interface Coach {
  id: string;
  uid: string;
  name: string;
  bio: string;
  specialties: string[];
  experience: number; // 経験年数
  rating: number; // 評価（1-5）
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoachAssignment {
  id: string;
  coachId: string;
  userId: string;
  status: 'active' | 'inactive' | 'pending';
  assignedAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  pdcaId: string;
  authorId: string;
  authorType: 'user' | 'coach' | 'ai';
  content: string;
  isPrivate: boolean; // ユーザーとコーチのみ見える
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoomMeeting {
  id: string;
  userId: string;
  coachId: string;
  scheduledAt: Date;
  duration: number; // 分単位
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  meetingUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// コーチング機能の型定義
export interface CoachingSession {
  id?: string;
  userId: string;
  coachId?: string; // AIコーチの場合は 'ai'
  sessionType: 'ai' | 'human';
  date: string;
  pdcaData: PDCACoachingData;
  feedback: CoachingFeedback[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface PDCACoachingData {
  plan?: string;
  do?: string;
  check?: string;
  action?: string;
  weekSummary?: string;
  monthSummary?: string;
  goals?: Goal[];
  challenges?: string[];
  achievements?: string[];
}

export interface CoachingFeedback {
  id: string;
  type: 'suggestion' | 'question' | 'encouragement' | 'improvement';
  content: string;
  targetPDCA?: 'plan' | 'do' | 'check' | 'action';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  isRead: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: 'personal' | 'professional' | 'health' | 'learning';
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnalysis {
  id: string;
  userId: string;
  date: string;
  analysisType: 'daily' | 'weekly' | 'monthly';
  insights: AnalysisInsight[];
  recommendations: AnalysisRecommendation[];
  patterns: AnalysisPattern[];
  score: number; // 0-100
  createdAt: Date;
}

export interface AnalysisInsight {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  confidence: number; // 0-1
  relatedPDCA?: 'plan' | 'do' | 'check' | 'action';
}

export interface AnalysisRecommendation {
  id: string;
  category: 'goal_setting' | 'time_management' | 'productivity' | 'wellness' | 'learning';
  title: string;
  description: string;
  actionItems: string[];
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number; // 0-100
}

export interface AnalysisPattern {
  id: string;
  patternType: 'behavior' | 'productivity' | 'mood' | 'goal_progress';
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  trend: 'improving' | 'declining' | 'stable';
  dataPoints: PatternDataPoint[];
}

export interface PatternDataPoint {
  date: string;
  value: number;
  label: string;
}

// コーチング設定
export interface CoachingSettings {
  userId: string;
  aiCoachingEnabled: boolean;
  humanCoachingEnabled: boolean;
  analysisFrequency: 'daily' | 'weekly' | 'monthly';
  notificationPreferences: {
    dailyReminder: boolean;
    weeklyAnalysis: boolean;
    goalDeadlines: boolean;
    coachingFeedback: boolean;
  };
  privacySettings: {
    shareWithCoach: boolean;
    shareAnalytics: boolean;
    anonymousData: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
