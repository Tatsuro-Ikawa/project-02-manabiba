'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import { DATA_RETENTION_MSG } from '@/lib/courseSelectionCatalog';
import { DataRetentionBanner } from '@/components/subscription/DataRetentionBanner';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';
import { ensureUserEnrollmentPrimaryCourse } from '@/lib/firestore';

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
          <div className="legal-page-content">
            <DataRetentionBanner userProfile={userProfile} />
            {showDowngradeNotice ? (
              <p className="start-program-downgrade-notice" role="status">
                フリーコースへ変更しました。
                {hadTrial ? ' 28日お試し期間は終了しました。' : null}
                気づきノート（有料機能）はご利用いただけません。{DATA_RETENTION_MSG}
              </p>
            ) : null}
            <h1 className="legal-page-title">7日間スタートプログラム（pdf版提供）</h1>
            <p className="legal-page-lead">
              セルフコーチングによる「自分を変える7日間プログラム」のpdf版を準備しました。<br/>ドキュメントをクリックして表示後、ダウンロードしてお使いください。
            </p>
            <p className="legal-page-lead">
              会員登録時の利用規約・プライバシーポリシーに従って、ご利用ください。
              <br />
              なお、ご自身による再配布はご遠慮願います。
            </p>
            <p className="start-program-pdf-actions">
              <a
                href="/contents/Pub-260805_v1.0.pdf"
                className="start-program-pdf-cover-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="7日間スタートプログラム PDFを別タブで開く"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/Pub-260805_v1.0.png"
                  alt="7日間スタートプログラム PDF版の表紙"
                  className="start-program-pdf-cover"
                  width={720}
                  height={1040}
                />
              </a>
            </p>
            <p className="legal-page-back">
              <Link href="/">ホームへ戻る</Link>
            </p>

            {userProfile?.enrollment?.primaryCourse === 'start7d' ? (
              <section className="start-program-upgrade" aria-label="気づきノートへのアップグレード">
                <p className="start-program-upgrade-lead">
                  自分を変える気づきノートにトライをしてみる →
                </p>
                <Link href="/trial_4w/landing" className="start-program-upgrade-cta">
                  気づきノートへアップグレード
                </Link>
              </section>
            ) : null}
          </div>
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
