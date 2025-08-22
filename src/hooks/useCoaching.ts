import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  createCoachingSession,
  getCoachingSessions,
  updateCoachingSession,
  createGoal,
  getUserGoals,
  updateGoal,
  deleteGoal,
  createAIAnalysis,
  getAIAnalyses,
  getCoachingSettings,
  updateCoachingSettings,
  CoachingSession,
  Goal,
  AIAnalysis,
  CoachingSettings
} from '@/lib/firestore';

export const useCoaching = () => {
  const { user } = useAuth();
  const [coachingSessions, setCoachingSessions] = useState<CoachingSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([]);
  const [coachingSettings, setCoachingSettings] = useState<CoachingSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // コーチングセッション関連
  const createSession = useCallback(async (sessionData: Omit<CoachingSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('ユーザーが認証されていません');
    
    try {
      setLoading(true);
      setError(null);
      const sessionId = await createCoachingSession(sessionData);
      await fetchCoachingSessions(); // セッション一覧を更新
      return sessionId;
    } catch (err) {
      console.error('セッション作成エラー:', err);
      setError('セッションの作成に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchCoachingSessions = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const sessions = await getCoachingSessions(user.uid);
      setCoachingSessions(sessions);
    } catch (err: any) {
      console.error('セッション取得エラー:', err);
      // インデックスエラーの場合は一時的に空配列を設定
      if (err.message && err.message.includes('index')) {
        console.log('Firestoreインデックスが作成中です。一時的に空のデータを表示します。');
        setCoachingSessions([]);
      } else {
        setError('セッションの取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<CoachingSession>) => {
    try {
      setLoading(true);
      setError(null);
      await updateCoachingSession(sessionId, updates);
      await fetchCoachingSessions(); // セッション一覧を更新
    } catch (err) {
      console.error('セッション更新エラー:', err);
      setError('セッションの更新に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCoachingSessions]);

  // 目標管理関連
  const createNewGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('ユーザーが認証されていません');
    
    try {
      setLoading(true);
      setError(null);
      const goalId = await createGoal(goalData);
      await fetchGoals(); // 目標一覧を更新
      return goalId;
    } catch (err) {
      console.error('目標作成エラー:', err);
      setError('目標の作成に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const userGoals = await getUserGoals(user.uid);
      setGoals(userGoals);
    } catch (err: any) {
      console.error('目標取得エラー:', err);
      // インデックスエラーの場合は一時的に空配列を設定
      if (err.message && err.message.includes('index')) {
        console.log('Firestoreインデックスが作成中です。一時的に空のデータを表示します。');
        setGoals([]);
      } else {
        setError('目標の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateGoalProgress = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    try {
      setLoading(true);
      setError(null);
      await updateGoal(goalId, updates);
      await fetchGoals(); // 目標一覧を更新
    } catch (err) {
      console.error('目標更新エラー:', err);
      setError('目標の更新に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchGoals]);

  const removeGoal = useCallback(async (goalId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteGoal(goalId);
      await fetchGoals(); // 目標一覧を更新
    } catch (err) {
      console.error('目標削除エラー:', err);
      setError('目標の削除に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchGoals]);

  // AI分析関連
  const createAnalysis = useCallback(async (analysisData: Omit<AIAnalysis, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('ユーザーが認証されていません');
    
    try {
      setLoading(true);
      setError(null);
      const analysisId = await createAIAnalysis(analysisData);
      await fetchAIAnalyses(); // 分析一覧を更新
      return analysisId;
    } catch (err) {
      console.error('AI分析作成エラー:', err);
      setError('AI分析の作成に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAIAnalyses = useCallback(async (analysisType?: 'daily' | 'weekly' | 'monthly') => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const analyses = await getAIAnalyses(user.uid, analysisType);
      setAiAnalyses(analyses);
    } catch (err: any) {
      console.error('AI分析取得エラー:', err);
      // インデックスエラーの場合は一時的に空配列を設定
      if (err.message && err.message.includes('index')) {
        console.log('Firestoreインデックスが作成中です。一時的に空のデータを表示します。');
        setAiAnalyses([]);
      } else {
        setError('AI分析の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // コーチング設定関連
  const fetchCoachingSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const settings = await getCoachingSettings(user.uid);
      setCoachingSettings(settings);
    } catch (err) {
      console.error('コーチング設定取得エラー:', err);
      setError('コーチング設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSettings = useCallback(async (settings: Partial<CoachingSettings>) => {
    if (!user) throw new Error('ユーザーが認証されていません');
    
    try {
      setLoading(true);
      setError(null);
      await updateCoachingSettings(user.uid, settings);
      await fetchCoachingSettings(); // 設定を更新
    } catch (err) {
      console.error('コーチング設定更新エラー:', err);
      setError('コーチング設定の更新に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchCoachingSettings]);

  // 初期データ読み込み
  useEffect(() => {
    if (user) {
      fetchCoachingSessions();
      fetchGoals();
      fetchAIAnalyses();
      fetchCoachingSettings();
    }
  }, [user, fetchCoachingSessions, fetchGoals, fetchAIAnalyses, fetchCoachingSettings]);

  return {
    // 状態
    coachingSessions,
    goals,
    aiAnalyses,
    coachingSettings,
    loading,
    error,
    
    // コーチングセッション
    createSession,
    updateSession,
    fetchCoachingSessions,
    
    // 目標管理
    createNewGoal,
    updateGoalProgress,
    removeGoal,
    fetchGoals,
    
    // AI分析
    createAnalysis,
    fetchAIAnalyses,
    
    // 設定
    updateSettings,
    fetchCoachingSettings,
  };
};
