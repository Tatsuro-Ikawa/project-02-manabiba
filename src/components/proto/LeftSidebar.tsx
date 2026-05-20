'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarVariant = 'home' | 'trial';

interface LeftSidebarProps {
  variant: SidebarVariant;
  /** トライアル時のみ: 現在のタブ（affirmation | morning_evening | weekly | monthly） */
  trialTab?: string;
  /** モバイル時: サイドバーを開いているか（開いているときのみ表示） */
  isOpen?: boolean;
  /** モバイル時: サイドバーを閉じるコールバック（リンククリックやオーバーレイ用） */
  onClose?: () => void;
}

export default function LeftSidebar({
  variant,
  trialTab,
  isOpen = false,
  onClose,
}: LeftSidebarProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  /** 気づきノート（旧トライアル本編）: `/trial_4w` および設定。コース選択ランディングは含めない */
  const isKizukiNote =
    pathname === '/trial_4w' ||
    (pathname.startsWith('/trial_4w/') && !pathname.startsWith('/trial_4w/landing'));
  const isTrialSettings = pathname === '/trial_4w/settings';
  const isStartProgram = pathname.startsWith('/start-program');
  const isMypage = pathname.startsWith('/mypage');
  const isCommunication = pathname === '/communication';

  const handleNav = () => onClose?.();

  return (
    <aside className={`left-sidebar ${isOpen ? 'active' : ''}`}>
      <Link
        href="/"
        className={`sidebar-btn ${isHome ? 'active' : ''}`}
        aria-label="ホーム"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>home</span>
        <span>ホーム</span>
      </Link>
      <Link
        href="/start-program"
        className={`sidebar-btn ${isStartProgram ? 'active' : ''}`}
        aria-label="スタートプログラム"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>play_circle</span>
        <span>スタート</span>
      </Link>
      <Link
        href="/trial_4w"
        className={`sidebar-btn ${isKizukiNote ? 'active' : ''}`}
        aria-label="気づきノート"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>edit_note</span>
        <span>実行</span>
      </Link>
      <Link
        href="/communication"
        className={`sidebar-btn ${isCommunication ? 'active' : ''}`}
        aria-label="コミュニケーション"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>forum</span>
        <span>コミュニケーション</span>
      </Link>
      {isKizukiNote && (
        <Link
          href="/trial_4w/settings"
          className={`sidebar-btn ${isTrialSettings ? 'active' : ''}`}
          aria-label="気づきノートの表示設定"
          onClick={handleNav}
        >
          <span className="material-symbols-outlined" aria-hidden>tune</span>
          <span>気づきノート設定</span>
        </Link>
      )}
      <Link
        href="/mypage"
        className={`sidebar-btn ${isMypage ? 'active' : ''}`}
        aria-label="マイページ"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>person</span>
        <span>マイページ</span>
      </Link>
    </aside>
  );
}
