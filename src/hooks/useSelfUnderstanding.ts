'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { 
  SelfUnderstandingData, 
  SelfUnderstandingEntry, 
  SelfUnderstandingSection,
  SelfUnderstandingDataFirestore,
  SelfUnderstandingEntryFirestore
} from '@/types/selfUnderstanding';
import { encrypt, decrypt } from '@/utils/encryption';

export const useSelfUnderstanding = () => {
  const { user } = useAuth();
  const [data, setData] = useState<SelfUnderstandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // FirestoreデータをDate型に変換
  const convertFirestoreData = useCallback((firestoreData: SelfUnderstandingDataFirestore): SelfUnderstandingData => {
    const convertEntry = (entry: SelfUnderstandingEntryFirestore): SelfUnderstandingEntry => ({
      ...entry,
      createdAt: entry.createdAt.toDate(),
      updatedAt: entry.updatedAt.toDate(),
    });

    return {
      ...firestoreData,
      entries: {
        aspirations: firestoreData.entries.aspirations.map(convertEntry),
        values: firestoreData.entries.values.map(convertEntry),
        strengths: firestoreData.entries.strengths.map(convertEntry),
        weaknesses: firestoreData.entries.weaknesses.map(convertEntry),
        resource: firestoreData.entries.resource.map(convertEntry),
      },
      lastUpdated: firestoreData.lastUpdated.toDate(),
      createdAt: firestoreData.createdAt.toDate(),
    };
  }, []);

  // Date型をFirestoreデータに変換
  const convertToFirestoreData = useCallback((data: SelfUnderstandingData): SelfUnderstandingDataFirestore => {
    const convertEntry = (entry: SelfUnderstandingEntry): SelfUnderstandingEntryFirestore => ({
      ...entry,
      createdAt: Timestamp.fromDate(entry.createdAt),
      updatedAt: Timestamp.fromDate(entry.updatedAt),
    });

    return {
      ...data,
      entries: {
        aspirations: data.entries.aspirations.map(convertEntry),
        values: data.entries.values.map(convertEntry),
        strengths: data.entries.strengths.map(convertEntry),
        weaknesses: data.entries.weaknesses.map(convertEntry),
        resource: data.entries.resource.map(convertEntry),
      },
      lastUpdated: Timestamp.fromDate(data.lastUpdated),
      createdAt: Timestamp.fromDate(data.createdAt),
    };
  }, []);

  // データを暗号化
  const encryptContent = useCallback(async (content: string): Promise<string> => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    return await encrypt(content, user.uid);
  }, [user?.uid]);

  // データを復号化
  const decryptContent = useCallback(async (encryptedContent: string): Promise<string> => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    return await decrypt(encryptedContent, user.uid);
  }, [user?.uid]);

  // データを読み込み
  const loadData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const docRef = doc(db, 'users', user.uid, 'aspirations', 'self-understanding');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const firestoreData = docSnap.data() as SelfUnderstandingDataFirestore;
        
        // 暗号化されたコンテンツを復号化
        const decryptedData = {
          ...firestoreData,
          entries: {
            aspirations: await Promise.all(firestoreData.entries.aspirations.map(async (entry) => ({
              ...entry,
              content: await decryptContent(entry.content),
            }))),
            values: await Promise.all(firestoreData.entries.values.map(async (entry) => ({
              ...entry,
              content: await decryptContent(entry.content),
            }))),
            strengths: await Promise.all(firestoreData.entries.strengths.map(async (entry) => ({
              ...entry,
              content: await decryptContent(entry.content),
            }))),
            weaknesses: await Promise.all(firestoreData.entries.weaknesses.map(async (entry) => ({
              ...entry,
              content: await decryptContent(entry.content),
            }))),
            resource: await Promise.all(firestoreData.entries.resource.map(async (entry) => ({
              ...entry,
              content: await decryptContent(entry.content),
            }))),
          },
        };

        const convertedData = convertFirestoreData(decryptedData);
        setData(convertedData);
      } else {
        // 初期データを作成
        const initialData: SelfUnderstandingData = {
          userId: user.uid,
          type: 'self-understanding',
          entries: {
            aspirations: [],
            values: [],
            strengths: [],
            weaknesses: [],
            resource: [],
          },
          lastUpdated: new Date(),
          createdAt: new Date(),
        };
        setData(initialData);
      }
    } catch (err) {
      console.error('データ読み込みエラー:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, convertFirestoreData, decryptContent]);

  // データを保存
  const saveData = useCallback(async (newData: SelfUnderstandingData) => {
    if (!user?.uid) {
      throw new Error('ユーザーが認証されていません');
    }

    try {
      setSaving(true);
      setError(null);

      // コンテンツを暗号化
      const encryptedData = {
        ...newData,
        entries: {
          aspirations: await Promise.all(newData.entries.aspirations.map(async (entry) => ({
            ...entry,
            content: await encryptContent(entry.content),
          }))),
          values: await Promise.all(newData.entries.values.map(async (entry) => ({
            ...entry,
            content: await encryptContent(entry.content),
          }))),
          strengths: await Promise.all(newData.entries.strengths.map(async (entry) => ({
            ...entry,
            content: await encryptContent(entry.content),
          }))),
          weaknesses: await Promise.all(newData.entries.weaknesses.map(async (entry) => ({
            ...entry,
            content: await encryptContent(entry.content),
          }))),
          resource: await Promise.all(newData.entries.resource.map(async (entry) => ({
            ...entry,
            content: await encryptContent(entry.content),
          }))),
        },
      };

      const firestoreData = convertToFirestoreData(encryptedData);
      const docRef = doc(db, 'users', user.uid, 'aspirations', 'self-understanding');
      
      await setDoc(docRef, firestoreData);
      setData(newData);
    } catch (err) {
      console.error('データ保存エラー:', err);
      setError('データの保存に失敗しました');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user?.uid, convertToFirestoreData, encryptContent]);

  // エントリーを追加
  const addEntry = useCallback(async (section: SelfUnderstandingSection, content: string) => {
    if (!data) return;

    const newEntry: SelfUnderstandingEntry = {
      id: `${section}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      order: data.entries[section].length + 1,
    };

    const newData: SelfUnderstandingData = {
      ...data,
      entries: {
        ...data.entries,
        [section]: [...data.entries[section], newEntry],
      },
      lastUpdated: new Date(),
    };

    await saveData(newData);
  }, [data, saveData]);

  // エントリーを更新
  const updateEntry = useCallback(async (section: SelfUnderstandingSection, id: string, content: string) => {
    if (!data) return;

    const newData: SelfUnderstandingData = {
      ...data,
      entries: {
        ...data.entries,
        [section]: data.entries[section].map(entry =>
          entry.id === id
            ? { ...entry, content, updatedAt: new Date() }
            : entry
        ),
      },
      lastUpdated: new Date(),
    };

    await saveData(newData);
  }, [data, saveData]);

  // エントリーを削除（物理削除）
  const deleteEntry = useCallback(async (section: SelfUnderstandingSection, id: string) => {
    if (!data) return;

    const newData: SelfUnderstandingData = {
      ...data,
      entries: {
        ...data.entries,
        [section]: data.entries[section].filter(entry => entry.id !== id),
      },
      lastUpdated: new Date(),
    };

    await saveData(newData);
  }, [data, saveData]);

  // エントリーの順序を変更
  const reorderEntries = useCallback(async (section: SelfUnderstandingSection, newOrder: SelfUnderstandingEntry[]) => {
    if (!data) return;

    // 順序を1から始まる連番で再設定
    const reorderedEntries = newOrder.map((entry, index) => ({
      ...entry,
      order: index + 1,
      updatedAt: new Date(),
    }));

    const newData: SelfUnderstandingData = {
      ...data,
      entries: {
        ...data.entries,
        [section]: reorderedEntries,
      },
      lastUpdated: new Date(),
    };

    await saveData(newData);
  }, [data, saveData]);



  // 初期化
  useEffect(() => {
    loadData();
  }, [loadData]);

  // データ読み込み後に1つのレコードの順序を修正
  useEffect(() => {
    if (data) {
      const sections: SelfUnderstandingSection[] = ['aspirations', 'values', 'strengths', 'weaknesses', 'resource'];
      let needsUpdate = false;
      
      sections.forEach(section => {
        const entries = data.entries[section];
        if (entries.length === 1 && entries[0].order !== 1) {
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        const updatedData = {
          ...data,
          entries: {
            ...data.entries,
            ...Object.fromEntries(
              sections.map(section => [
                section,
                data.entries[section].map((entry, index) => ({
                  ...entry,
                  order: index + 1,
                }))
              ])
            )
          }
        };
        saveData(updatedData);
      }
    }
  }, [data, saveData]);

  return {
    data,
    loading,
    error,
    saving,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
    refresh: loadData,
  };
};
