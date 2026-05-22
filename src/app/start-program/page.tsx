'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { hasAcceptedCurrentConsents } from '@/lib/consent';

/**
 * 7日間スタートプログラム（現状はダミー本体）。
 * 未ログイン・未同意のときはログイン／同意フローへリダイレクトする。
 */
export default function StartProgramPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
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
    if (loading) return;
    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent('/post-login?next=' + encodeURIComponent('/start-program'))}`
      );
      return;
    }
    if (!userProfile) return;
    if (!hasAcceptedCurrentConsents(userProfile)) {
      router.replace(`/consent?next=${encodeURIComponent('/start-program')}`);
      return;
    }
    setAccessOk(true);
  }, [loading, user, userProfile, router]);

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
            <h1 className="legal-page-title">7日間プログラム（ダミー）</h1>
            <p className="legal-page-lead">
              セルフコーチングによる「自分を変える7日間プログラム」の画面です。会員登録時の利用規約・プライバシー同意（1回）のうえで表示しています。
            </p>
            <p className="legal-page-placeholder">
              コンテンツ・日次タスク・進捗表示などは今後実装予定です。
            </p>
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
