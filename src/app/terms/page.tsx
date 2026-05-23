'use client';

import { useEffect, useState } from 'react';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { LegalSectionsView } from '@/components/legal/LegalSectionsView';
import { loadTermsDocument } from '@/lib/legal/loadLegalDocuments';
import type { TermsDocument } from '@/lib/legal/types';

export default function TermsPage() {
  const [doc, setDoc] = useState<TermsDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTermsDocument()
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LegalPageShell title={doc?.title ?? '利用規約'} version={doc?.version} loading={loading} error={error}>
      {doc ? <LegalSectionsView sections={doc.sections} /> : null}
    </LegalPageShell>
  );
}
