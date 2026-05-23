'use client';

import { useEffect, useState } from 'react';
import { loadLegalBundle } from '@/lib/legal/loadLegalDocuments';
import type { LegalBundle } from '@/lib/legal/types';

export function useLegalDocuments() {
  const [bundle, setBundle] = useState<LegalBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadLegalBundle()
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch((e) => {
        console.error('loadLegalBundle error:', e);
        if (!cancelled) {
          setBundle(null);
          setError(e instanceof Error ? e.message : '条文の読み込みに失敗しました。');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { bundle, loading, error };
}
