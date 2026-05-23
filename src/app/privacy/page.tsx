'use client';

import { useEffect, useState } from 'react';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { LegalPrivacyView } from '@/components/legal/LegalPrivacyView';
import { loadPrivacyDocument } from '@/lib/legal/loadLegalDocuments';
import type { PrivacyDocument } from '@/lib/legal/types';

export default function PrivacyPage() {
  const [doc, setDoc] = useState<PrivacyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPrivacyDocument()
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
    <LegalPageShell
      title={doc?.title ?? 'プライバシーポリシー'}
      version={doc?.version}
      loading={loading}
      error={error}
    >
      {doc ? <LegalPrivacyView paragraphs={doc.paragraphs} /> : null}
    </LegalPageShell>
  );
}
