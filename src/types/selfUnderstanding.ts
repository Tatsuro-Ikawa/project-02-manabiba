export interface Question {
  id: string;
  category: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'scale' | 'checkbox';
  options?: string[];
  scaleRange?: { min: number; max: number; labels: { min: string; max: string } };
  isRequired: boolean;
  order: number;
}

export interface UserAnswer {
  id: string;
  userId: string;
  questionId: string;
  answer: string | number | string[];
  createdAt: Date;
  updatedAt: Date;
}

// 新しい自己理解エントリー型
export interface SelfUnderstandingEntry {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  order: number;
}

// セクションタイプ
export type SelfUnderstandingSection = 'aspirations' | 'values' | 'strengths' | 'weaknesses' | 'resource';

// 自己理解データの全体構造
export interface SelfUnderstandingData {
  userId: string;
  type: 'self-understanding';
  entries: {
    aspirations: SelfUnderstandingEntry[];
    values: SelfUnderstandingEntry[];
    strengths: SelfUnderstandingEntry[];
    weaknesses: SelfUnderstandingEntry[];
    resource: SelfUnderstandingEntry[];
  };
  lastUpdated: Date;
  createdAt: Date;
}

// Firestore用の型（Timestamp対応）
export interface SelfUnderstandingEntryFirestore {
  id: string;
  content: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  isDeleted: boolean;
  order: number;
}

export interface SelfUnderstandingDataFirestore {
  userId: string;
  type: 'self-understanding';
  entries: {
    aspirations: SelfUnderstandingEntryFirestore[];
    values: SelfUnderstandingEntryFirestore[];
    strengths: SelfUnderstandingEntryFirestore[];
    weaknesses: SelfUnderstandingEntryFirestore[];
    resource: SelfUnderstandingEntryFirestore[];
  };
  lastUpdated: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
}

export interface UserProfile {
  id: string;
  userId: string;
  // 基本情報
  name: string;
  age?: number;
  gender?: string;
  occupation?: string;
  location?: string;
  
  // 性格・価値観
  personalityTraits: string[];
  values: string[];
  strengths: string[];
  weaknesses: string[];
  
  // 目標・願望
  shortTermGoals: string[];
  longTermGoals: string[];
  dreams: string[];
  
  // 環境・状況
  currentChallenges: string[];
  supportNeeds: string[];
  
  // メタデータ
  completionRate: number; // 0-100
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileInsight {
  id: string;
  userId: string;
  type: 'personality' | 'strengths' | 'goals' | 'challenges';
  title: string;
  description: string;
  recommendations: string[];
  confidence: number; // 0-100
  createdAt: Date;
}
