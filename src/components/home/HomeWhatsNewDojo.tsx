'use client';

import Link from 'next/link';

const DUMMY_DOJO_NEWS =
  '道場からのお知らせ（ダミー）です。今後は館長メッセージ等をここに表示し、コミュニケーションへ誘導します。';

export default function HomeWhatsNewDojo() {
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
      <p className="home-dojo-news-body">{DUMMY_DOJO_NEWS}</p>
    </section>
  );
}

