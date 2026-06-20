'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { CourseChangePanel } from '@/components/subscription/CourseChangePanel';
import { useAuth } from '@/hooks/useAuth';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';
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
      if (!shouldRedirectUnauthenticatedToLogin()) return;
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
        <div className="trial-main course-change-main">
          <div className="trial-landing-top">
            <Link href="/" className="trial-landing-back" aria-label="ホームへ戻る">
              戻る
            </Link>
          </div>
          <h1 className="course-change-page-title">コース変更・選択画面</h1>
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
