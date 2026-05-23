'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';

type LegalPageShellProps = {
  title: string;
  version?: string;
  loading: boolean;
  error: string | null;
  children: ReactNode;
};

export function LegalPageShell({ title, version, loading, error, children }: LegalPageShellProps) {
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

      <div className="home-main-wrapper">
        <main className="legal-page-main">
          <div className="legal-page-content">
            <h1 className="legal-page-title">{title}</h1>
            {version ? <p className="legal-page-version text-sm text-gray-500 mb-4">版: {version}</p> : null}
            {loading ? (
              <p className="legal-page-placeholder">読み込み中…</p>
            ) : error ? (
              <p className="legal-page-placeholder text-red-600" role="alert">
                {error}
              </p>
            ) : (
              children
            )}
            <p className="legal-page-back">
              <Link href="/">ホームへ戻る</Link>
            </p>
          </div>
        </main>
      </div>

      <ProtoFooter />
    </div>
  );
}
