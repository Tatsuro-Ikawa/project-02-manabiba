import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  getPDCAEntry, 
  getUserPDCAEntries, 
  updatePDCAItem, 
  PDCAData 
} from '@/lib/firestore';
import { formatDateToJST, getTodayJST } from '@/utils/dateUtils';

export const usePDCA = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentPDCA, setCurrentPDCA] = useState<PDCAData | null>(null);
  const [allEntries, setAllEntries] = useState<PDCAData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 今日の日付を初期値に設定
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(getTodayJST());
    }
  }, [selectedDate]);

  // 選択された日付のPDCAデータを取得
  const fetchPDCA = useCallback(async () => {
    if (!user || !selectedDate) {
      setCurrentPDCA(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const pdcaData = await getPDCAEntry(user.uid, selectedDate);
      console.log('PDCAデータ取得:', pdcaData);
      setCurrentPDCA(pdcaData);
    } catch (err) {
      console.error('PDCA取得エラー:', err);
      setError('PDCAデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    fetchPDCA();
  }, [fetchPDCA]);

  // ユーザーの全PDCAエントリを取得
  useEffect(() => {
    const fetchAllEntries = async () => {
      if (!user) {
        setAllEntries([]);
        return;
      }

      try {
        const entries = await getUserPDCAEntries(user.uid);
        setAllEntries(entries);
      } catch (err) {
        console.error('全PDCAエントリ取得エラー:', err);
        setError('PDCAエントリの取得に失敗しました');
      }
    };

    fetchAllEntries();
  }, [user]);

  // 特定のPDCA項目を更新
  const updatePDCA = async (
    item: 'plan' | 'do' | 'check' | 'action',
    value: string
  ) => {
    if (!user || !selectedDate) {
      throw new Error('ユーザーまたは日付が設定されていません');
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('PDCA更新開始:', { item, value, uid: user.uid, date: selectedDate });
      
      await updatePDCAItem(user.uid, selectedDate, item, value);
      
      // 現在のPDCAデータを更新
      const updatedPDCA = await getPDCAEntry(user.uid, selectedDate);
      console.log('更新後のPDCAデータ:', updatedPDCA);
      
      // 状態を強制的に更新
      setCurrentPDCA(null); // 一度nullにリセット
      setTimeout(() => {
        setCurrentPDCA(updatedPDCA); // 新しいデータを設定
      }, 0);
      
      // 全エントリも更新
      const updatedEntries = await getUserPDCAEntries(user.uid);
      setAllEntries(updatedEntries);
      
      console.log('PDCA更新完了');
      
    } catch (err) {
      console.error('PDCA更新エラー:', err);
      setError('PDCAの更新に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 日付を選択
  const selectDate = (date: Date) => {
    setSelectedDate(formatDateToJST(date));
  };

  // 今日の日付に戻る
  const goToToday = () => {
    setSelectedDate(getTodayJST());
  };

  // 入力可能なPDCA項目を判定
  const getInputStatus = () => {
    if (!currentPDCA) {
      return {
        plan: false,
        do: false,
        check: false,
        action: false,
      };
    }

    return {
      plan: !currentPDCA.plan,
      do: !currentPDCA.do,
      check: !currentPDCA.check,
      action: !currentPDCA.action,
    };
  };

  return {
    selectedDate,
    currentPDCA,
    allEntries,
    loading,
    error,
    updatePDCA,
    selectDate,
    goToToday,
    getInputStatus,
    formatDate: formatDateToJST,
    fetchPDCA, // デバッグ用に追加
  };
};
