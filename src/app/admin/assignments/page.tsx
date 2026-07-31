'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import CoachClientAssignmentAdmin from '@/components/admin/CoachClientAssignmentAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const { mode, setMode } = useViewMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      router.replace('/login');
      return;
    }
    if (!userProfile) return;
    if (userProfile.role !== 'admin') return;
    if (mode !== 'admin') {
      setMode('admin');
    }
  }, [loading, user, userProfile, router, mode, setMode]);

  const isAdmin = !!user && userProfile?.role === 'admin';

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
        <main className="home-main-content">
          {loading ? (
            <p className="text-sm text-gray-600">読み込み中…</p>
          ) : !user ? (
            <p className="text-sm text-gray-600">ログインが必要です。</p>
          ) : !isAdmin ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800 mb-2">アクセス権限がありません</h2>
              <p className="text-red-600 text-sm">
                コーチ↔クライアント割当は管理者（role: admin）のみ利用できます。
              </p>
            </div>
          ) : (
            <CoachClientAssignmentAdmin />
          )}
        </main>
      </div>
    </div>
  );
}
