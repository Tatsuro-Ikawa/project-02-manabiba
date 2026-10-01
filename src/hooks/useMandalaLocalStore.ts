'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  emptyMandalaDomains,
  type MandalaDomainsState,
} from '@/lib/startProgram/mandalaConstants';

const STORAGE_KEY = 'startProgram.sevenSteps.step01';

export type MandalaLocalStore = {
  domains: MandalaDomainsState;
  centerGoal: string;
};

function readStore(): MandalaLocalStore {
  if (typeof window === 'undefined') {
    return { domains: emptyMandalaDomains(), centerGoal: '' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { domains: emptyMandalaDomains(), centerGoal: '' };
    const parsed = JSON.parse(raw) as MandalaLocalStore;
    return {
      domains: { ...emptyMandalaDomains(), ...parsed.domains },
      centerGoal: parsed.centerGoal ?? '',
    };
  } catch {
    return { domains: emptyMandalaDomains(), centerGoal: '' };
  }
}

function writeStore(next: MandalaLocalStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Step1 曼荼羅 — ブラウザ localStorage（P2 で Firestore に置換） */
export function useMandalaLocalStore() {
  const [store, setStore] = useState<MandalaLocalStore>(() => readStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: MandalaLocalStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  const setDomains = useCallback(
    (updater: (prev: MandalaDomainsState) => MandalaDomainsState) => {
      setStore((prev) => {
        const next = { ...prev, domains: updater(prev.domains) };
        writeStore(next);
        return next;
      });
    },
    []
  );

  const setCenterGoal = useCallback((centerGoal: string) => {
    setStore((prev) => {
      const next = { ...prev, centerGoal };
      writeStore(next);
      return next;
    });
  }, []);

  return { store, hydrated, persist, setDomains, setCenterGoal };
}
