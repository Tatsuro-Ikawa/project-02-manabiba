'use client';

import { useCallback } from 'react';
import { useStartProgramAppSettings } from '@/hooks/useStartProgramAppSettings';

/** Step3 候補上限（設定画面・FocusPhase で共有） */
export function useStep03CandidateMax() {
  const { settings, saveSettings, hydrated } = useStartProgramAppSettings();

  const setCandidateMax = useCallback(
    (n: number) => saveSettings({ step03CandidateMax: n }),
    [saveSettings]
  );

  return { candidateMax: settings.step03CandidateMax, setCandidateMax, hydrated };
}
