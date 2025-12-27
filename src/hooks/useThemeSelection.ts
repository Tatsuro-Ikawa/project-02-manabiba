import { useState, useEffect, useCallback } from 'react';
import { 
  ThemeSelectionData, 
  ThemeEntry, 
  UserType, 
  ThemeSelectionStep,
  ThemeSelectionDataFirestore,
  ThemeEntryFirestore
} from '@/types/themeSelection';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { encryptThemeData, decryptThemeData } from '@/utils/encryption';

// Firestoreデータの変換（暗号化データから復元）
const convertFirestoreData = async (firestoreData: ThemeSelectionDataFirestore, userId: string): Promise<ThemeSelectionData> => {
  const decryptedData = await decryptThemeData(firestoreData.encryptedData, userId);
  return {
    ...decryptedData,
    id: firestoreData.id,
    status: firestoreData.status,
    createdAt: firestoreData.createdAt.toDate(),
    updatedAt: firestoreData.updatedAt.toDate(),
    lastSavedAt: firestoreData.lastSavedAt?.toDate()
  };
};

export const useThemeSelection = (sessionId?: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<ThemeSelectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<ThemeSelectionStep>('user-type');
  const [sessions, setSessions] = useState<ThemeSelectionData[]>([]);

  // セッション一覧の読み込み
  const loadSessions = useCallback(async () => {
    if (!user) return;

    try {
      const sessionsRef = collection(db, 'users', user.uid, 'theme-selection');
      // インデックスエラーを避けるため、シンプルなクエリに変更
      const q = query(sessionsRef, where('status', 'in', ['draft', 'published']));
      const querySnapshot = await getDocs(q);
      
      const sessionsList: ThemeSelectionData[] = [];
      for (const doc of querySnapshot.docs) {
        const firestoreData = doc.data() as ThemeSelectionDataFirestore;
        const convertedData = await convertFirestoreData(firestoreData, user.uid);
        sessionsList.push(convertedData);
      }
      
      // クライアント側でソート
      sessionsList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setSessions(sessionsList);
    } catch (err) {
      console.error('セッション一覧の読み込みエラー:', err);
    }
  }, [user]);

  // 特定セッションの読み込み
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const targetSessionId = sessionId || `session_${Date.now()}`;
      console.log('useThemeSelection - loadData: targetSessionId:', targetSessionId);
      
      const docRef = doc(db, 'users', user.uid, 'theme-selection', targetSessionId);
      const docSnap = await getDoc(docRef);
      
      console.log('useThemeSelection - loadData: docSnap.exists():', docSnap.exists());

      if (docSnap.exists()) {
        const firestoreData = docSnap.data() as ThemeSelectionDataFirestore;
        const convertedData = await convertFirestoreData(firestoreData, user.uid);
        setData(convertedData);
        
        // ステップの決定
        setCurrentStep(convertedData.currentStep || 'user-type');
        console.log('useThemeSelection - loadData: loaded existing data:', convertedData);
      } else {
        // 指定されたセッションが見つからない場合、最新のセッションを検索
        console.log('useThemeSelection - loadData: session not found, searching for latest session');
        const sessionsRef = collection(db, 'users', user.uid, 'theme-selection');
        const q = query(sessionsRef, where('status', 'in', ['draft', 'published']));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // 最新のセッションを取得
          const latestDoc = querySnapshot.docs[0];
          const firestoreData = latestDoc.data() as ThemeSelectionDataFirestore;
          const convertedData = await convertFirestoreData(firestoreData, user.uid);
          setData(convertedData);
          setCurrentStep(convertedData.currentStep || 'user-type');
          console.log('useThemeSelection - loadData: loaded latest session:', convertedData);
        } else {
          // 初期データの作成
          const initialData: ThemeSelectionData = {
            id: targetSessionId,
            userType: 'aspiration',
            entries: [],
            completed: false,
            status: 'draft',
            currentStep: 'list-up', // 願望型の場合はリストアップから開始
            createdAt: new Date(),
            updatedAt: new Date()
          };
          setData(initialData);
          setCurrentStep('list-up');
          console.log('useThemeSelection - loadData: created new session:', initialData);
        }
      }
    } catch (err) {
      console.error('テーマ選択データの読み込みエラー:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, sessionId]);

  // データの保存（段階的永続化）
  const saveData = useCallback(async (newData: Partial<ThemeSelectionData>, autoSave: boolean = false) => {
    if (!user || !data) return;

    try {
      setSaving(true);
      setError(null);

      const updatedData = {
        ...data,
        ...newData,
        updatedAt: new Date(),
        lastSavedAt: new Date()
      };

      const docRef = doc(db, 'users', user.uid, 'theme-selection', updatedData.id);
      
      // 暗号化して保存
      const encryptedData = await encryptThemeData({
        userType: updatedData.userType,
        entries: updatedData.entries,
        selectedTheme: updatedData.selectedTheme,
        completed: updatedData.completed,
        currentStep: updatedData.currentStep
      }, user.uid);

      const firestoreData: ThemeSelectionDataFirestore = {
        id: updatedData.id,
        status: updatedData.status,
        createdAt: Timestamp.fromDate(updatedData.createdAt),
        updatedAt: Timestamp.fromDate(updatedData.updatedAt),
        lastSavedAt: Timestamp.fromDate(updatedData.lastSavedAt!),
        encryptedData: encryptedData
      };
      
      await setDoc(docRef, firestoreData);
      
      // データの状態を即座に更新
      setData(updatedData);
      console.log('useThemeSelection - saveData: data updated:', updatedData);
      
      // セッション一覧を更新
      if (!autoSave) {
        await loadSessions();
      }
    } catch (err) {
      console.error('テーマ選択データの保存エラー:', err);
      setError('データの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [user, data, loadSessions]);

  // ユーザータイプの設定
  const setUserType = useCallback(async (userType: UserType) => {
    await saveData({ userType, currentStep: 'list-up' });
    setCurrentStep('list-up');
  }, [saveData]);

  // エントリの追加
  const addEntry = useCallback(async (entry: Omit<ThemeEntry, 'id' | 'createdAt'>) => {
    if (!data) {
      console.log('useThemeSelection - addEntry: data is null');
      return;
    }

    const newEntry: ThemeEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    console.log('useThemeSelection - addEntry: newEntry:', newEntry);
    console.log('useThemeSelection - addEntry: current entries:', data.entries);

    const updatedEntries = [...data.entries, newEntry];
    console.log('useThemeSelection - addEntry: updatedEntries:', updatedEntries);
    
    await saveData({ entries: updatedEntries }, true); // 自動保存
  }, [data, saveData]);

  // エントリの更新
  const updateEntry = useCallback(async (id: string, updates: Partial<ThemeEntry>) => {
    if (!data) return;

    const updatedEntries = data.entries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    );
    await saveData({ entries: updatedEntries }, true); // 自動保存
  }, [data, saveData]);

  // エントリの削除
  const deleteEntry = useCallback(async (id: string) => {
    if (!data) return;

    const updatedEntries = data.entries.filter(entry => entry.id !== id);
    await saveData({ entries: updatedEntries }, true); // 自動保存
  }, [data, saveData]);

  // テーマの選択
  const selectTheme = useCallback(async (themeId: string) => {
    await saveData({ selectedTheme: themeId, currentStep: 'complete' });
    setCurrentStep('complete');
  }, [saveData]);

  // 完了状態の設定
  const setCompleted = useCallback(async (completed: boolean) => {
    await saveData({ completed, status: completed ? 'published' : 'draft' });
  }, [saveData]);

  // ステップの設定
  const setStep = useCallback(async (step: ThemeSelectionStep) => {
    console.log('useThemeSelection - setStep: step:', step, 'current data:', data);
    setCurrentStep(step);
    if (data) {
      await saveData({ currentStep: step }, true); // 自動保存
    }
  }, [data, saveData]);

  // 新しいセッションの作成
  const createNewSession = useCallback(async (userType: UserType) => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const initialData: ThemeSelectionData = {
      id: newSessionId,
      userType,
      entries: [],
      completed: false,
      status: 'draft',
      currentStep: 'user-type',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setData(initialData);
    setCurrentStep('user-type');
    await saveData(initialData);
  }, [saveData]);

  // セッションの削除
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'users', user.uid, 'theme-selection', sessionId);
      await updateDoc(docRef, { status: 'deleted' });
      await loadSessions();
    } catch (err) {
      console.error('セッション削除エラー:', err);
      setError('セッションの削除に失敗しました');
    }
  }, [user, loadSessions]);

  // 初期化
  useEffect(() => {
    loadData();
    // インデックスエラーを避けるため、セッション一覧読み込みを一時的に無効化
    // loadSessions();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    saving,
    currentStep,
    sessions,
    setUserType,
    addEntry,
    updateEntry,
    deleteEntry,
    selectTheme,
    setCompleted,
    setStep,
    createNewSession,
    deleteSession,
    loadData,
    loadSessions
  };
};
