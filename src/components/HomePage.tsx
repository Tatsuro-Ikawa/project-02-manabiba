'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';

export default function HomePage() {
  const searchParams = useSearchParams();
  const loggedIn = searchParams.get('logged_in') === 'true';
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
      <ProtoHeader
        loggedIn={loggedIn}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar
        variant="home"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="home-main-wrapper">
        <main className="home-main-content">
          <section className="banner-section">
            <p className="banner-message">
              一度きりの人生、なりたい自分を目指しませんか？
            </p>
            <div className="banner-buttons">
              {loggedIn ? (
                <Link href="/trial_4w" className="banner-btn active">
                  こころのトライアルを続ける
                </Link>
              ) : (
                <>
                  <Link href="/trial_4w" className="banner-btn active">
                    28日間 こころのトライアルを始める
                  </Link>
                  <span className="banner-btn inactive">ログインして続きから</span>
                </>
              )}
            </div>
          </section>

          <div className="home-content-grid">
            <div className="home-content-left">
              <section className="content-section">
                <h2 className="section-title">最新動画</h2>
                <div className="video-carousel">
                  <div className="video-carousel-container">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="video-item">
                        <div className="video-thumbnail">動画 {i}</div>
                        <div className="video-title">サンプル動画タイトル {i}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="content-section">
                <h2 className="section-title">本日の一番</h2>
                <div className="today-best-image">画像エリア</div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>
                  本日のおすすめコンテンツ（モック）
                </p>
              </section>

              <section className="content-section">
                <h2 className="section-title">昨日までの積重ね</h2>
                <div className="calendar-preview">カレンダー風プレビュー</div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>
                  継続日数・記録（モック）
                </p>
              </section>

              <section className="content-section">
                <h2 className="section-title">最新記事</h2>
                <ul className="article-list">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="article-item">
                      <div className="article-thumbnail">図</div>
                      <div className="article-content">
                        <div>記事タイトル {i}</div>
                        <div className="article-summary">記事の要約テキスト（モック）</div>
                        <div className="article-meta">YYYY/MM/DD</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="content-section">
                <h2 className="section-title">SNS</h2>
                <div className="sns-links">
                  <a href="#" className="sns-icon facebook" aria-label="Facebook">f</a>
                  <a href="#" className="sns-icon instagram" aria-label="Instagram">📷</a>
                  <a href="#" className="sns-icon twitter" aria-label="X">X</a>
                  <a href="#" className="sns-icon youtube" aria-label="YouTube">▶</a>
                </div>
              </section>
            </div>

            <aside className="home-content-right">
              <section className="content-section">
                <h2 className="section-title">参考リンク</h2>
                <ul className="reference-links">
                  <li className="reference-category">
                    <div className="reference-category-title">カテゴリA</div>
                    <div className="reference-link-item">リンク1</div>
                    <div className="reference-link-item">リンク2</div>
                  </li>
                  <li className="reference-category">
                    <div className="reference-category-title">カテゴリB</div>
                    <div className="reference-link-item">リンク3</div>
                  </li>
                </ul>
              </section>
              <section className="content-section">
                <div className="ad-area">広告エリア（モック）</div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
