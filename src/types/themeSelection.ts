// ユーザータイプ
export type UserType = 'aspiration' | 'problem';

// テーマエントリ
export interface ThemeEntry {
  id: string;
  text: string;
  category: string;
  metrics: {
    // 願望型の場合
    desire?: number;      // やりたい度
    excitement?: number;  // ワクワク度
    feasibility?: number; // 実現可能性
    
    // 課題型の場合
    severity?: number;    // 困り度
    frequency?: number;   // 頻度
  };
  createdAt: Date;
  userType: UserType;
}

// テーマ選択データ
export interface ThemeSelectionData {
  id: string;                    // セッションID
  userType: UserType;
  entries: ThemeEntry[];
  selectedTheme?: string;
  completed: boolean;
  status: 'draft' | 'published'; // ステータス管理
  currentStep: ThemeSelectionStep;
  createdAt: Date;
  updatedAt: Date;
  lastSavedAt?: Date;            // 最後の保存時刻
}

// Firestore用の型定義
export interface ThemeEntryFirestore {
  id: string;
  text: string;
  category: string;
  metrics: {
    desire?: number;
    excitement?: number;
    feasibility?: number;
    severity?: number;
    frequency?: number;
  };
  createdAt: any; // Firestore Timestamp
  userType: UserType;
}

export interface ThemeSelectionDataFirestore {
  id: string;
  status: 'draft' | 'published' | 'deleted';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  lastSavedAt?: any; // Firestore Timestamp
  encryptedData: string; // 暗号化されたデータ
}

// カテゴリテンプレート
export interface CategoryTemplate {
  name: string;
  examples: string[];
}

// 評価指標
export interface MetricTemplate {
  key: string;
  label: string;
  icon: string;
  description: string;
}

// テーマ選択ステップ
export type ThemeSelectionStep = 'user-type' | 'list-up' | 'categorize' | 'evaluate' | 'select-theme' | 'complete';
