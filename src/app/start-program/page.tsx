'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';
import { ensureUserEnrollmentPrimaryCourse } from '@/lib/firestore';
import { isStartProgramRefreshEnabled } from '@/lib/featureFlags';
import StartProgramLegacyView from '@/components/start-program/StartProgramLegacyView';
import StartProgramRefreshView from '@/components/start-program/StartProgramRefreshView';

/**
 * 7日間スタートプログラム（PDF版提供）。
 * 未ログイン・未同意のときはログイン／同意フローへリダイレクトする。
 */
function StartProgramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const { bundle, loading: legalLoading } = useLegalDocuments();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accessOk, setAccessOk] = useState(false);

  const showDowngradeNotice = searchParams.get('downgraded') === 'free';
  const hadTrial = searchParams.get('hadTrial') === '1';
  const startProgramRefresh = isStartProgramRefreshEnabled();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (loading || legalLoading || !bundle) return;
    if (!user) {
      if (!shouldRedirectUnauthenticatedToLogin()) return;
      router.replace(
        `/login?next=${encodeURIComponent('/start-program')}`
      );
      return;
    }
    if (!userProfile) return;
    if (!hasAcceptedCurrentConsents(userProfile, bundle.terms.version, bundle.privacy.version)) {
      router.replace(`/consent?next=${encodeURIComponent('/start-program')}`);
      return;
    }
    setAccessOk(true);
  }, [loading, legalLoading, bundle, user, userProfile, router]);

  useEffect(() => {
    if (!accessOk || !user?.uid) return;
    void (async () => {
      try {
        await ensureUserEnrollmentPrimaryCourse(user.uid, 'start7d');
        await refreshUserProfile();
      } catch (e) {
        console.error('enrollment start7d 保存エラー:', e);
      }
    })();
  }, [accessOk, user?.uid, refreshUserProfile]);

  if (!accessOk) {
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
            <p className="legal-page-placeholder" style={{ textAlign: 'center' }}>
              確認中...
            </p>
          </main>
        </div>
        <ProtoFooter />
      </div>
    );
  }

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
          {startProgramRefresh ? (
            <StartProgramRefreshView />
          ) : (
            <StartProgramLegacyView
              userProfile={userProfile}
              showDowngradeNotice={showDowngradeNotice}
              hadTrial={hadTrial}
            />
          )}
        </main>
      </div>

      <ProtoFooter />
    </div>
  );
}

export default function StartProgramPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
          読み込み中...
        </div>
      }
    >
      <StartProgramContent />
    </Suspense>
  );
}
