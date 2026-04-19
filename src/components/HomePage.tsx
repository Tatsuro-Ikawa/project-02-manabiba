'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import LatestVideosEditModal from '@/components/home/LatestVideosEditModal';
import LatestArticlesEditModal from '@/components/home/LatestArticlesEditModal';
import ReferenceLinksEditModal from '@/components/home/ReferenceLinksEditModal';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import { getHomeContent } from '@/lib/firestore';
import type { HomeLatestVideoEntry, HomeLatestArticleEntry, HomeReferenceLinkEntry } from '@/lib/firestore';
import type { LatestVideoItem } from '@/components/home/LatestVideosEditModal';
import type { LatestArticleItem } from '@/components/home/LatestArticlesEditModal';
import type { ReferenceLinkItem } from '@/components/home/ReferenceLinksEditModal';

export default function HomePage() {
  const { user, loading, userProfile } = useAuth();
  const { mode } = useViewMode();
  const loggedIn = !loading && !!user;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latestVideosModalOpen, setLatestVideosModalOpen] = useState(false);
  const [latestArticlesModalOpen, setLatestArticlesModalOpen] = useState(false);
  const [referenceLinksModalOpen, setReferenceLinksModalOpen] = useState(false);
  const [latestVideos, setLatestVideos] = useState<HomeLatestVideoEntry[]>([]);
  const [latestArticles, setLatestArticles] = useState<HomeLatestArticleEntry[]>([]);
  const [referenceLinks, setReferenceLinks] = useState<HomeReferenceLinkEntry[]>([]);
  const [homeContentLoading, setHomeContentLoading] = useState(true);
  const showEditUi = loggedIn && userProfile?.role === 'admin' && mode === 'admin';

  const loadHomeContent = useCallback(async () => {
    setHomeContentLoading(true);
    try {
      const content = await getHomeContent();
      setLatestVideos(content?.latestVideos ?? []);
      setLatestArticles(content?.latestArticles ?? []);
      setReferenceLinks(content?.referenceLinks ?? []);
    } catch (e) {
      console.error('getHomeContent error:', e);
      setLatestVideos([]);
      setLatestArticles([]);
      setReferenceLinks([]);
    } finally {
      setHomeContentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeContent();
  }, [loadHomeContent]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showAdSection = !loggedIn || userProfile?.role === 'admin';

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader
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
          <section id="home-banner" className="banner-section">
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
                  <Link href="/trial_4w/landing" className="banner-btn active">
                    試してみる
                  </Link>
                  <span className="banner-btn inactive">ログインして続きから</span>
                </>
              )}
            </div>
          </section>

          <div className="home-content-grid">
            <div className="home-content-left">
              <section id="home-section-latest-videos" className="content-section">
                {showEditUi && (
                  <div className="home-section-edit-trigger">
                    <button
                      type="button"
                      className="home-edit-btn"
                      onClick={() => setLatestVideosModalOpen(true)}
                      aria-label="おすすめ動画を編集"
                    >
                      <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 18 }}>
                        edit
                      </span>
                      <span>編集</span>
                    </button>
                  </div>
                )}
                <h2 className="section-title">おすすめ動画</h2>
                <div className="video-carousel">
                  <div className="video-carousel-container">
                    {homeContentLoading ? (
                      <p className="text-sm text-gray-500">読み込み中...</p>
                    ) : latestVideos.length === 0 ? (
                      <p className="text-sm text-gray-500">登録された動画はありません。</p>
                    ) : (
                      latestVideos
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((video, i) => (
                          <div key={`${video.url}-${i}`} className="video-item">
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="video-thumbnail-link"
                            >
                              {video.thumbnailUrl ? (
                                <img
                                  src={video.thumbnailUrl}
                                  alt=""
                                  className="video-thumbnail-img"
                                />
                              ) : (
                                <div className="video-thumbnail">動画</div>
                              )}
                            </a>
                            <div className="video-title">{video.title || '（タイトルなし）'}</div>
                            {(video.author_name || video.author_url) && (
                              <div className="video-author">
                                作成者:{' '}
                                {video.author_url ? (
                                  <a
                                    href={video.author_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="video-author-link"
                                  >
                                    {video.author_name || video.author_url}
                                  </a>
                                ) : (
                                  <span>{video.author_name}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </section>

              {loggedIn && (
                <section id="home-section-today-best" className="content-section">
                  <h2 className="section-title">本日の一番</h2>
                  <div className="today-best-image">画像エリア</div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>
                    本日のおすすめコンテンツ（モック）
                  </p>
                </section>
              )}

              {loggedIn && (
                <section id="home-section-continuation" className="content-section">
                  <h2 className="section-title">昨日までの積重ね</h2>
                  <div className="calendar-preview">カレンダー風プレビュー</div>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>
                    継続日数・記録（モック）
                  </p>
                </section>
              )}

              <section id="home-section-latest-articles" className="content-section">
                {showEditUi && (
                  <div className="home-section-edit-trigger">
                    <button
                      type="button"
                      className="home-edit-btn"
                      onClick={() => setLatestArticlesModalOpen(true)}
                      aria-label="注目記事を編集"
                    >
                      <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 18 }}>
                        edit
                      </span>
                      <span>編集</span>
                    </button>
                  </div>
                )}
                <h2 className="section-title">注目記事</h2>
                <div className="video-carousel">
                  <div className="video-carousel-container">
                    {homeContentLoading ? (
                      <p className="text-sm text-gray-500">読み込み中...</p>
                    ) : latestArticles.length === 0 ? (
                      <p className="text-sm text-gray-500">登録された記事はありません。</p>
                    ) : (
                      latestArticles
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((article, i) => (
                          <div key={`${article.url}-${i}`} className="article-item-card">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="article-thumbnail-link"
                            >
                              {article.thumbnailUrl ? (
                                <img
                                  src={article.thumbnailUrl}
                                  alt=""
                                  className="article-thumbnail-img"
                                />
                              ) : (
                                <div className="article-thumbnail-placeholder">記事</div>
                              )}
                            </a>
                            <div className="article-card-body">
                              <div className="article-card-title">{article.title || '（タイトルなし）'}</div>
                              {article.lead && (
                                <div className="article-card-lead">{article.lead}</div>
                              )}
                              {article.source && (
                                <div className="article-card-source">出所: {article.source}</div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </section>

              <section id="home-section-sns" className="content-section">
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
              <section id="home-section-reference-links" className="content-section">
                {showEditUi && (
                  <div className="home-section-edit-trigger">
                    <button
                      type="button"
                      className="home-edit-btn"
                      onClick={() => setReferenceLinksModalOpen(true)}
                      aria-label="いちおしサイトを編集"
                    >
                      <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 18 }}>
                        edit
                      </span>
                      <span>編集</span>
                    </button>
                  </div>
                )}
                <h2 className="section-title">いちおしサイト</h2>
                <div className="reference-links-list">
                  {homeContentLoading ? (
                    <p className="text-sm text-gray-500">読み込み中...</p>
                  ) : referenceLinks.length === 0 ? (
                    <p className="text-sm text-gray-500">登録されたサイトはありません。</p>
                  ) : (
                    referenceLinks
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((link, i) => (
                        <a
                          key={`${link.url}-${i}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="reference-link-card"
                        >
                          <span className="reference-link-thumb">
                            {link.thumbnailUrl ? (
                              <img
                                src={link.thumbnailUrl}
                                alt=""
                                className="reference-link-thumb-img"
                              />
                            ) : (
                              <span className="reference-link-thumb-placeholder">link</span>
                            )}
                          </span>
                          <span className="reference-link-body">
                            <span className="reference-link-title">{link.title || '（タイトルなし）'}</span>
                            <span className="reference-link-site-name">{link.siteName || '（サイト名なし）'}</span>
                          </span>
                        </a>
                      ))
                  )}
                </div>
              </section>
              {showAdSection && (
                <section id="home-section-ad" className="content-section">
                  <div className="ad-area">広告エリア（モック）</div>
                </section>
              )}
            </aside>
          </div>
        </main>
      </div>

      <ProtoFooter />

      <LatestVideosEditModal
        isOpen={latestVideosModalOpen}
        onClose={() => setLatestVideosModalOpen(false)}
        initialItems={latestVideos.map((v, i) => ({
          ...v,
          id: `v-${i}`,
        })) as LatestVideoItem[]}
        onSaved={loadHomeContent}
      />
      <LatestArticlesEditModal
        isOpen={latestArticlesModalOpen}
        onClose={() => setLatestArticlesModalOpen(false)}
        initialItems={latestArticles.map((a, i) => ({
          ...a,
          id: `a-${i}`,
        })) as LatestArticleItem[]}
        onSaved={loadHomeContent}
      />
      <ReferenceLinksEditModal
        isOpen={referenceLinksModalOpen}
        onClose={() => setReferenceLinksModalOpen(false)}
        initialItems={referenceLinks.map((r, i) => ({
          ...r,
          title: r.title ?? '',
          id: `r-${i}`,
        })) as ReferenceLinkItem[]}
        onSaved={loadHomeContent}
      />
    </div>
  );
}
