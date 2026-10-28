'use client';

import { useEffect, useRef, useState } from 'react';

export type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: number } | { kind: 'offline' };

/** 入力が止まってからサーバーへ送るまでの待ち時間（14 §2.2） */
export const SAVE_DEBOUNCE_MS = 2000;

/**
 * 保存状態の表示（モック）。値が変わるたびに待ち時間を数え直し、止まったら「保存しました」にする。
 * 実際の保存は各ストアの localStorage のまま。
 */
export function useSaveStatusMock(value: unknown): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const first = useRef(true);
  const pending = useRef(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = true;
    if (!navigator.onLine) {
      setStatus({ kind: 'offline' });
      return;
    }
    setStatus({ kind: 'saving' });
    const timer = window.setTimeout(() => {
      pending.current = false;
      setStatus({ kind: 'saved', at: Date.now() });
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onOnline = () => {
      if (pending.current) {
        pending.current = false;
        setStatus({ kind: 'saved', at: Date.now() });
      }
    };
    const onOffline = () => {
      if (pending.current) setStatus({ kind: 'offline' });
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return status;
}
