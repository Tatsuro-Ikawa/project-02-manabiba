import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';
import { 
  UserProfile, 
  UserRole, 
  SubscriptionPlan, 
  FeatureAccess, 
  UsageLimits, 
  SubscriptionInfo 
} from '@/types/auth';

export interface PDCAData {
  id?: string;
  uid: string;
  date: string;
  plan?: string;
  planCreatedAt?: Timestamp;
  planUpdatedAt?: Timestamp;
  do?: string;
  doCreatedAt?: Timestamp;
  doUpdatedAt?: Timestamp;
  check?: string;
  checkCreatedAt?: Timestamp;
  checkUpdatedAt?: Timestamp;
  action?: string;
  actionCreatedAt?: Timestamp;
  actionUpdatedAt?: Timestamp;
  // 週・月単位の集約用フィールド
  weekOfYear?: number;
  monthOfYear?: number;
  year?: number;
  // コメント機能
  comments?: string[];
  coachComments?: string[];
  aiComments?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// 週・月単位の集約データ
export interface PDCAAggregation {
  id?: string;
  uid: string;
  period: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  weekOfYear?: number;
  monthOfYear?: number;
  year: number;
  summary: {
    totalEntries: number;
    completedEntries: number;
    completionRate: number;
    keyAchievements: string[];
    challenges: string[];
    nextActions: string[];
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// コーチング機能の型定義
export interface CoachingSession {
  id?: string;
  userId: string;
  sessionType: 'coaching' | 'goalSetting' | 'aiAnalysis';
  sessionDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Goal {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  status: 'notStarted' | 'inProgress' | 'completed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AIAnalysis {
  id?: string;
  userId: string;
  analysisType: 'daily' | 'weekly' | 'monthly';
  analysisDate: Timestamp;
  summary?: string;
  keyPoints?: string[];
  challenges?: string[];
  recommendations?: string[];
  createdAt?: Timestamp;
}

export interface CoachingSettings {
  id?: string;
  userId: string;
  autoGoalCreation: boolean;
  autoAnalysisGeneration: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}


// ユーザープロファイル関連の関数
export const createUserProfile = async (userProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await setDoc(doc(db, 'users', userProfile.uid), {
      ...userProfile,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
  } catch (error) {
    console.error('ユーザープロファイル作成エラー:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
        subscription: {
          ...data.subscription,
          startDate: data.subscription?.startDate?.toDate(),
          endDate: data.subscription?.endDate?.toDate(),
        },
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('ユーザープロファイル取得エラー:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    console.error('ユーザープロファイル更新エラー:', error);
    throw error;
  }
};

export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      lastLoginAt: now,
    });
  } catch (error) {
    console.error('最終ログイン更新エラー:', error);
    throw error;
  }
};

// サブスクリプション関連の関数
export const updateSubscription = async (
  uid: string, 
  subscription: Partial<SubscriptionInfo>
): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      'subscription': {
        ...subscription,
        startDate: subscription.startDate || now,
        updatedAt: now,
      },
      updatedAt: now,
    });
  } catch (error) {
    console.error('サブスクリプション更新エラー:', error);
    throw error;
  }
};

export const updateUsageLimits = async (
  uid: string, 
  usage: Partial<UsageLimits>
): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      'subscription.usage': usage,
      updatedAt: now,
    });
  } catch (error) {
    console.error('利用制限更新エラー:', error);
    throw error;
  }
};

// 権限チェック用の関数
export const checkUserPermission = async (
  uid: string, 
  feature: keyof FeatureAccess
): Promise<boolean> => {
  try {
    const userProfile = await getUserProfile(uid);
    if (!userProfile) return false;
    
    const plan = userProfile.subscription.plan;
    const SUBSCRIPTION_PLANS = {
      free: {
        pdca: true,
        aiComments: false,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: false,
        advancedAnalytics: false,
      },
      standard: {
        pdca: true,
        aiComments: true,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: true,
        advancedAnalytics: false,
      },
      premium: {
        pdca: true,
        aiComments: true,
        coachComments: true,
        zoomMeetings: true,
        communityAccess: true,
        advancedAnalytics: true,
      },
    };
    
    return SUBSCRIPTION_PLANS[plan][feature] || false;
  } catch (error) {
    console.error('権限チェックエラー:', error);
    return false;
  }
};

// デフォルトユーザープロファイル作成
export const createDefaultUserProfile = async (user: User): Promise<UserProfile> => {
  const defaultProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'lastLoginAt'> = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'ユーザー',
    photoURL: user.photoURL || undefined,
    role: 'user',
    subscription: {
      plan: 'free',
      status: 'active',
      startDate: new Date(),
      features: {
        pdca: true,
        aiComments: false,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: false,
        advancedAnalytics: false,
      },
      usage: {
        pdcaEntries: 0,
        aiComments: 0,
        zoomMeetings: 0,
        coachSessions: 0,
      },
    },
  };
  
  await createUserProfile(defaultProfile);
  return {
    ...defaultProfile,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };
};

// PDCA操作
export const getPDCAEntry = async (uid: string, date: string): Promise<PDCAData | null> => {
  try {
    const q = query(
      collection(db, 'pdca_entries'),
      where('uid', '==', uid),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PDCAData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('PDCAエントリ取得エラー:', error);
    throw error;
  }
};

export const getUserPDCAEntries = async (uid: string): Promise<PDCAData[]> => {
  try {
    const q = query(
      collection(db, 'pdca_entries'),
      where('uid', '==', uid),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PDCAData[];
  } catch (error) {
    console.error('ユーザーPDCAエントリ取得エラー:', error);
    throw error;
  }
};

export const createPDCAEntry = async (pdcaData: Omit<PDCAData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const entryData: Omit<PDCAData, 'id'> = {
      ...pdcaData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'pdca_entries'), entryData);
    return docRef.id;
  } catch (error) {
    console.error('PDCAエントリ作成エラー:', error);
    throw error;
  }
};

export const updatePDCAEntry = async (id: string, updates: Partial<PDCAData>): Promise<void> => {
  try {
    const docRef = doc(db, 'pdca_entries', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('PDCAエントリ更新エラー:', error);
    throw error;
  }
};

// 特定のPDCA項目を更新
export const updatePDCAItem = async (
  uid: string, 
  date: string, 
  item: 'plan' | 'do' | 'check' | 'action', 
  value: string
): Promise<void> => {
  try {
    const entry = await getPDCAEntry(uid, date);
    const now = serverTimestamp() as Timestamp;
    
    if (entry) {
      // 既存エントリを更新
      await updatePDCAEntry(entry.id!, {
        [item]: value,
        [`${item}CreatedAt`]: entry[`${item}CreatedAt`] || now,
        [`${item}UpdatedAt`]: now,
      });
    } else {
      // 新規エントリを作成
      const newEntry: Omit<PDCAData, 'id' | 'createdAt' | 'updatedAt'> = {
        uid,
        date,
        [item]: value,
        [`${item}CreatedAt`]: now,
        [`${item}UpdatedAt`]: now,
      };
      await createPDCAEntry(newEntry);
    }
  } catch (error) {
    console.error('PDCA項目更新エラー:', error);
    throw error;
  }
};

// コーチング機能のFirestore関数
export const createCoachingSession = async (session: Omit<CoachingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'coaching_sessions'), {
      ...session,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('コーチングセッション作成エラー:', error);
    throw error;
  }
};

export const getCoachingSessions = async (userId: string): Promise<CoachingSession[]> => {
  try {
    const q = query(
      collection(db, 'coaching_sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as CoachingSession[];
  } catch (error) {
    console.error('コーチングセッション取得エラー:', error);
    throw error;
  }
};

export const updateCoachingSession = async (sessionId: string, updates: Partial<CoachingSession>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'coaching_sessions', sessionId), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    console.error('コーチングセッション更新エラー:', error);
    throw error;
  }
};

export const createGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'goals'), {
      ...goal,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('目標作成エラー:', error);
    throw error;
  }
};

export const getUserGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Goal[];
  } catch (error) {
    console.error('目標取得エラー:', error);
    throw error;
  }
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'goals', goalId), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    console.error('目標更新エラー:', error);
    throw error;
  }
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'goals', goalId));
  } catch (error) {
    console.error('目標削除エラー:', error);
    throw error;
  }
};

export const createAIAnalysis = async (analysis: Omit<AIAnalysis, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'ai_analyses'), {
      ...analysis,
      createdAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('AI分析作成エラー:', error);
    throw error;
  }
};

export const getAIAnalyses = async (userId: string, analysisType?: 'daily' | 'weekly' | 'monthly'): Promise<AIAnalysis[]> => {
  try {
    let q = query(
      collection(db, 'ai_analyses'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (analysisType) {
      q = query(q, where('analysisType', '==', analysisType));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as AIAnalysis[];
  } catch (error) {
    console.error('AI分析取得エラー:', error);
    throw error;
  }
};

export const getCoachingSettings = async (userId: string): Promise<CoachingSettings | null> => {
  try {
    const docRef = doc(db, 'coaching_settings', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as CoachingSettings;
    }
    return null;
  } catch (error) {
    console.error('コーチング設定取得エラー:', error);
    throw error;
  }
};

export const updateCoachingSettings = async (userId: string, settings: Partial<CoachingSettings>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await setDoc(doc(db, 'coaching_settings', userId), {
      ...settings,
      userId,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    console.error('コーチング設定更新エラー:', error);
    throw error;
  }
};

// 週・月単位のPDCA集約データ取得
export const getPDCAAggregation = async (
  userId: string, 
  aggregationType: 'weekly' | 'monthly',
  startDate: string,
  endDate: string
): Promise<PDCAAggregation | null> => {
  try {
    const q = query(
      collection(db, 'pdca_aggregations'),
      where('userId', '==', userId),
      where('aggregationType', '==', aggregationType),
      where('startDate', '==', startDate),
      where('endDate', '==', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as PDCAAggregation;
    }
    return null;
  } catch (error) {
    console.error('PDCA集約データ取得エラー:', error);
    throw error;
  }
};

export const createPDCAAggregation = async (aggregation: Omit<PDCAAggregation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'pdca_aggregations'), {
      ...aggregation,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('PDCA集約データ作成エラー:', error);
    throw error;
  }
};
