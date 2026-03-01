'use client';

import Link from 'next/link';

interface ProtoHeaderProps {
  /** ログイン風表示（モック） */
  loggedIn?: boolean;
  /** モバイル時: サイドバーが開いているか */
  sidebarOpen?: boolean;
  /** モバイル時: ハンバーガーメニュー押下でサイドバー開閉 */
  onToggleSidebar?: () => void;
}

export default function ProtoHeader({
  loggedIn = false,
  sidebarOpen = false,
  onToggleSidebar,
}: ProtoHeaderProps) {
  return (
    <header className="proto-header">
      <div className="header-left">
        <button
          type="button"
          className="sidebar-toggle-btn"
          aria-label={sidebarOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
          title="メニュー（ホーム・こころのトライアル・マイページ）"
        >
          <span className="material-symbols-outlined" aria-hidden>
            {sidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>
      <h1>人生学び場 こころ道場</h1>
      <div className="header-right">
        {loggedIn ? (
          <Link href="/mypage" className="proto-user-avatar" aria-label="マイページ" />
        ) : (
          <Link href="/" className="proto-login-btn">
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
