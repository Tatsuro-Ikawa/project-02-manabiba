'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type JournalDetailLevel,
  readJournalDetailLevelFromStorage,
  writeJournalDetailLevelDefaultToStorage,
  writeJournalDetailLevelToStorage,
} from '@/lib/journalDetailLevel';

type JournalDetailLevelContextValue = {
  level: JournalDetailLevel;
  /** ナビなど：現在の表示レベル（localStorage に保存） */
  setLevel: (level: JournalDetailLevel) => void;
  /** 設定画面：デフォルト＋現在値をまとめて保存 */
  setDefaultLevel: (level: JournalDetailLevel) => void;
  hydrated: boolean;
};

const JournalDetailLevelContext = createContext<JournalDetailLevelContextValue | null>(null);

export function JournalDetailLevelProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<JournalDetailLevel>('normal');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLevelState(readJournalDetailLevelFromStorage());
    setHydrated(true);
  }, []);

  const setLevel = useCallback((next: JournalDetailLevel) => {
    setLevelState(next);
    writeJournalDetailLevelToStorage(next);
  }, []);

  const setDefaultLevel = useCallback((next: JournalDetailLevel) => {
    setLevelState(next);
    writeJournalDetailLevelDefaultToStorage(next);
  }, []);

  const value = useMemo(
    () => ({ level, setLevel, setDefaultLevel, hydrated }),
    [level, setLevel, setDefaultLevel, hydrated]
  );

  return (
    <JournalDetailLevelContext.Provider value={value}>{children}</JournalDetailLevelContext.Provider>
  );
}

export function useJournalDetailLevel(): JournalDetailLevelContextValue {
  const ctx = useContext(JournalDetailLevelContext);
  if (!ctx) {
    throw new Error('useJournalDetailLevel must be used within JournalDetailLevelProvider');
  }
  return ctx;
}
