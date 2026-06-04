'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { ApplyFormPanel } from '@/components/subscription/ApplyFormPanel';
import '@/styles/subscription-flow.css';

function ApplyPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar variant="home" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <div className="sub-flow-page-head">
            <Link href="/trial_4w/landing" className="sub-flow-back">
              コース選択へ戻る
            </Link>
            <h1>お申し込み</h1>
          </div>
          <ApplyFormPanel />
        </div>
      </div>

      <ProtoFooter />
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
          読み込み中...
        </div>
      }
    >
      <ApplyPageContent />
    </Suspense>
  );
}
