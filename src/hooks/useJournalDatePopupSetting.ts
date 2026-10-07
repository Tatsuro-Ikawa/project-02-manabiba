'use client';

import { useCallback, useEffect, useState } from 'react';

/** 気づきノート朝・晩：入力中に記入日をポップアップ表示するか（端末ごと・既定 false） */
const STORAGE_KEY = 'manabiba:journal-date-popup';
const CHANGED_EVENT = 'journalDatePopupSettingChanged';

function readJournalDatePopup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function useJournalDatePopupSetting() {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabledState(readJournalDatePopup());
    setHydrated(true);

    const reload = () => setEnabledState(readJournalDatePopup());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGED_EVENT, reload);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
      window.dispatchEvent(new Event(CHANGED_EVENT));
    } catch {
      /* ignore quota */
    }
    setEnabledState(next);
  }, []);

  return { enabled, setEnabled, hydrated };
}
