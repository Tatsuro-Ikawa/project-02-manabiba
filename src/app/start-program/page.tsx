'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import { ensureUserEnrollmentPrimaryCourse } from '@/lib/firestore';

/**
 * 7日間スタートプログラム（現状はダミー本体）。
 * 未ログイン・未同意のときはログイン／同意フローへリダイレクトする。
 */
export default function StartProgramPage() {
  const router = useRouter();
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const { bundle, loading: legalLoading } = useLegalDocuments();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accessOk, setAccessOk] = useState(false);

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
            <h1 className="legal-page-title">7日間スタートプログラム（ダミー）</h1>
            <p className="legal-page-lead">
              セルフコーチングによる「自分を変える7日間プログラム」の画面です。会員登録時の利用規約・プライバシー同意（1回）のうえで表示しています。
            </p>
            <p className="legal-page-placeholder">
              左メニューの <strong>スタート</strong> からいつでもこの画面に戻れます。コンテンツ・日次タスク・進捗表示などは今後実装予定です。
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
