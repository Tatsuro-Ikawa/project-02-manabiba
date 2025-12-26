import { useState, useEffect, useCallback } from 'react';
import { SMARTGoal } from '@/types/goals';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export const useGoals = (themeId?: string) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firestoreデータの変換
  const convertFirestoreGoal = (data: any): SMARTGoal => {
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      targetDate: data.targetDate?.toDate() || new Date(),
      milestones: (data.milestones || []).map((m: any) => ({
        ...m,
        targetDate: m.targetDate?.toDate() || new Date(),
      })),
    };
  };

  // 全目標を読み込み
  const loadAllGoals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const goalsRef = collection(db, 'users', user.uid, 'smart-goals');
      const querySnapshot = await getDocs(goalsRef);

      const goalsList: SMARTGoal[] = [];
      querySnapshot.forEach((doc) => {
        goalsList.push(convertFirestoreGoal(doc.data()));
      });

      // 更新日時で降順ソート
      goalsList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      setGoals(goalsList);
      console.log('useGoals - 全目標を読み込みました:', goalsList.length, '件');
    } catch (err) {
      console.error('目標の読み込みエラー:', err);
      setError('目標の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 特定テーマの目標を読み込み（draft または active のみ）
  const loadGoalsByTheme = useCallback(async () => {
    if (!user || !themeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const goalsRef = collection(db, 'users', user.uid, 'smart-goals');
      const q = query(goalsRef, where('themeId', '==', themeId));
      const querySnapshot = await getDocs(q);

      const goalsList: SMARTGoal[] = [];
      querySnapshot.forEach((doc) => {
        const goal = convertFirestoreGoal(doc.data());
        // draft または active のみを取得（完了済みやキャンセルは除外）
        if (goal.status === 'draft' || goal.status === 'active') {
          goalsList.push(goal);
        }
      });

      // 更新日時で降順ソート（最新が先頭）
      goalsList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      setGoals(goalsList);
      console.log(`useGoals - テーマ ${themeId} の目標を読み込みました:`, goalsList.length, '件');
    } catch (err) {
      console.error('目標の読み込みエラー:', err);
      setError('目標の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, themeId]);

  // 特定の目標を読み込み
  const loadGoalById = useCallback(async (goalId: string): Promise<SMARTGoal | null> => {
    if (!user) return null;

    try {
      const goalRef = doc(db, 'users', user.uid, 'smart-goals', goalId);
      const goalSnap = await getDoc(goalRef);

      if (goalSnap.exists()) {
        return convertFirestoreGoal(goalSnap.data());
      }
      return null;
    } catch (err) {
      console.error('目標の読み込みエラー:', err);
      return null;
    }
  }, [user]);

  // 初期化
  useEffect(() => {
    if (themeId) {
      loadGoalsByTheme();
    } else {
      loadAllGoals();
    }
  }, [themeId, loadGoalsByTheme, loadAllGoals]);

  return {
    goals,
    loading,
    error,
    loadAllGoals,
    loadGoalsByTheme,
    loadGoalById,
  };
};

