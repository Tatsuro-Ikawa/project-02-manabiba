'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchLatestPublicDirectorAnnouncement } from '@/lib/directorAnnouncements';
import { truncateDirectorAnnouncementPreview } from '@/lib/directorAnnouncementPreview';

export default function HomeWhatsNewDojo() {
  const [title, setTitle] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const latest = await fetchLatestPublicDirectorAnnouncement();
        if (cancelled) return;
        if (!latest) {
          setTitle(null);
          setPreview(null);
          return;
        }
        setTitle(latest.title);
        setPreview(truncateDirectorAnnouncementPreview(latest.bodyMarkdown));
      } catch (e) {
        console.error('fetchLatestPublicDirectorAnnouncement error:', e);
        if (!cancelled) {
          setTitle(null);
          setPreview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="home-section-whats-new-dojo" className="content-section home-dojo-news">
      <div className="home-dojo-news-head">
        <h2 className="section-title home-dojo-news-title">新着情報（道場から）</h2>
        <Link
          href="/communication?tab=director"
          className="home-message-detail-link"
          aria-label="道場からの新着情報の詳細・一覧へ"
        >
          詳細
          <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 18 }}>
            chevron_right
          </span>
        </Link>
      </div>
      {loading ? (
        <p className="home-dojo-news-body text-sm text-gray-500">読み込み中…</p>
      ) : !title || !preview ? (
        <p className="home-dojo-news-body text-sm text-gray-500">お知らせはまだありません。</p>
      ) : (
        <>
          <h3 className="home-dojo-news-item-title">{title}</h3>
          <p className="home-dojo-news-body">{preview}</p>
        </>
      )}
    </section>
  );
}
