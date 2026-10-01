'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  START_PROGRAM_SETTINGS_CHANGED_EVENT,
  START_PROGRAM_SETTINGS_STORAGE_KEY,
  defaultStartProgramAppSettings,
  readStartProgramAppSettings,
  writeStartProgramAppSettings,
  type StartProgramAppSettings,
} from '@/lib/startProgram/appSettings';

/** スタートプログラムの設定値（設定画面・各 Step で共有） */
export function useStartProgramAppSettings() {
  const [settings, setSettingsState] = useState<StartProgramAppSettings>(
    defaultStartProgramAppSettings
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettingsState(readStartProgramAppSettings());
    setHydrated(true);

    const reload = () => setSettingsState(readStartProgramAppSettings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === START_PROGRAM_SETTINGS_STORAGE_KEY) reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(START_PROGRAM_SETTINGS_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(START_PROGRAM_SETTINGS_CHANGED_EVENT, reload);
    };
  }, []);

  const saveSettings = useCallback((patch: Partial<StartProgramAppSettings>) => {
    setSettingsState(writeStartProgramAppSettings(patch));
  }, []);

  return { settings, saveSettings, hydrated };
}
