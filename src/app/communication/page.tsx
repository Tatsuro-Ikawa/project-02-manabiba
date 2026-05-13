'use client';

import { Suspense } from 'react';
import CommunicationPageClient from '@/components/communication/CommunicationPageClient';

function CommunicationFallback() {
  return (
    <div className="home-main-wrapper" style={{ fontFamily: 'var(--font-family-jp)' }}>
      <main className="home-main-content">
        <p className="text-sm text-gray-600">読み込み中…</p>
      </main>
    </div>
  );
}

/**
 * コミュニケーション: 館長から（デフォルト）／メッセージボード。
 * クエリ: `?tab=director` | `?tab=board`、`coachClient` はトライアルと共有。
 */
export default function CommunicationPage() {
  return (
    <Suspense fallback={<CommunicationFallback />}>
      <CommunicationPageClient />
    </Suspense>
  );
}
