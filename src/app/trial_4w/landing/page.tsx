'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';

function Trial4wLandingContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const loggedIn = !loading && !!user;
  const freeSignupNext = '/post-login?next=/start-program';
  const kizukiTrialNext = '/post-login?next=/trial_4w';

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
      <LeftSidebar variant="trial" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <div className="trial-landing-top">
            <Link href="/" className="trial-landing-back" aria-label="ホームへ戻る">
              戻る
            </Link>
          </div>

          <h2 className="trial-landing-headline">一度きりの人生、なりたい自分を目指しませんか？</h2>

          <div className="trial-landing-stack">
            <section className="trial-landing-card" aria-label="7日間プログラム">
              <div className="trial-landing-subtitle">◆ なりたい自分への近道</div>
              <div className="trial-landing-card-inner">
                <div className="trial-landing-card-title">自分を変える7日間プログラム</div>
                <div className="trial-landing-cols trial-landing-cols--single">
                  <div className="trial-landing-col">
                    <div className="trial-landing-col-header">セルフコーチング（フリーコース）</div>
                    <div className="trial-landing-price-box">
                      <div className="trial-landing-price">¥0</div>
                    </div>
                    {loggedIn ? (
                      <Link href={freeSignupNext} className="trial-landing-cta">
                        やってみる
                      </Link>
                    ) : (
                      <Link
                        href={`/login?next=${encodeURIComponent(freeSignupNext)}`}
                        className="trial-landing-cta"
                      >
                        やってみる
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <section className="trial-landing-card" aria-label="ページ 2/2">
              <div className="trial-landing-subtitle">◆ 習慣化へのはじめの一歩</div>
              <div className="trial-landing-card-inner">
                <div className="trial-landing-card-title">気づきと学びのマネジメント日誌「学び帳(仮)」
                </div>
                <div className="trial-landing-cols">
                  <div className="trial-landing-col">
                    <div className="trial-landing-col-header">AIコーチ</div>
                    <div className="trial-landing-price-box">
                      <div className="trial-landing-price strike">¥1,650/月</div>
                      <div className="trial-landing-price strike">¥1,320/月*</div>
                      <div className="trial-landing-note small strike">* 年払い　15,840/年</div>
                      <div className="trial-landing-price">¥1,320/月</div>
                      <div className="trial-landing-price">¥980/月*</div>
                      <div className="trial-landing-note small">年払い　11,760/年</div>
                      <div className="trial-landing-note small">(オープン期間(2026年末)限定価格)</div>
                      <div className="trial-landing-badge">28日間フリー</div>
                    </div>
                    {loggedIn ? (
                      <Link href={kizukiTrialNext} className="trial-landing-cta">
                        やってみる
                      </Link>
                    ) : (
                      <Link href={`/login?next=${encodeURIComponent(kizukiTrialNext)}`} className="trial-landing-cta">
                        やってみる
                      </Link>
                    )}
                  </div>
                  <div className="trial-landing-col">
                    <div className="trial-landing-col-header">プライベートコーチ</div>
                    <div className="trial-landing-price-box">
                      <div className="trial-landing-price strike">¥6,600/月</div>
                      <div className="trial-landing-price">¥3,300/月</div>
                      <div className="trial-landing-note small">(オープン期間(2026年末)限定価格)</div>
                      <div className="trial-landing-badge">60分セッション/月*</div>
                      <div className="trial-landing-note small">* 追加対応　6,600円/60分</div>
                    </div>
                    <button type="button" className="trial-landing-cta disabled" disabled>
                      やってみる
                    </button>
                  </div>
                </div>
                <p className="trial-landing-tokushoho-note">
                  特定商取引法に基づく表記は
                  <Link href="/legal/tokushoho">こちら</Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ProtoFooter />
    </div>
  );
}

export default function Trial4wLandingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ fontFamily: 'var(--font-family-jp)' }}
        >
          読み込み中...
        </div>
      }
    >
      <Trial4wLandingContent />
    </Suspense>
  );
}

