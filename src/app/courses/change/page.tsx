'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { CourseChangePanel } from '@/components/subscription/CourseChangePanel';
import { useAuth } from '@/hooks/useAuth';
import '@/styles/subscription-flow.css';

function CourseChangeContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/courses/change')}`);
    }
  }, [loading, user, router]);

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
            <Link href="/" className="sub-flow-back">
              ホームへ戻る
            </Link>
            <h1>コース変更</h1>
            <p className="sub-flow-note">
              Stripe 連携前の仮画面です。プラン変更の表示・導線確認用。
            </p>
          </div>
          {!loading && user ? <CourseChangePanel userProfile={userProfile} /> : <p>読み込み中...</p>}
        </div>
      </div>

      <ProtoFooter />
    </div>
  );
}

export default function CourseChangePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
          読み込み中...
        </div>
      }
    >
      <CourseChangeContent />
    </Suspense>
  );
}
