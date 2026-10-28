'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ACCESS_MOCK_CHANGED_EVENT,
  ACCESS_MOCK_STORAGE_KEY,
  readAccessMock,
  resolveAccess,
  scenarioState,
  writeAccessMock,
  type AccessMockState,
  type AccessScenario,
} from '@/lib/startProgram/accessMock';

/** Step5 以降の利用条件（モック・14 §3） */
export function useStartProgramAccess() {
  const [state, setState] = useState<AccessMockState | null>(null);

  useEffect(() => {
    const reload = () => setState(readAccessMock());
    reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === ACCESS_MOCK_STORAGE_KEY) reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(ACCESS_MOCK_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ACCESS_MOCK_CHANGED_EVENT, reload);
    };
  }, []);

  const update = useCallback((fn: (s: AccessMockState) => AccessMockState) => {
    setState(writeAccessMock(fn(readAccessMock())));
  }, []);

  const setScenario = useCallback((scenario: AccessScenario) => update((s) => scenarioState(scenario, s)), [update]);
  const markNoticeSeen = useCallback(() => update((s) => ({ ...s, step05NoticeSeenAt: Date.now() })), [update]);
  const subscribe = useCallback(() => update((s) => ({ ...s, plan: 'standard' })), [update]);

  return {
    hydrated: state != null,
    state,
    access: state ? resolveAccess(state) : null,
    setScenario,
    markNoticeSeen,
    subscribe,
  };
}
