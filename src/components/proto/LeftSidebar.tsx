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
  const isTrial = pathname.startsWith('/trial_4w');
  const isMypage = pathname.startsWith('/mypage');

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
        href="/trial_4w"
        className={`sidebar-btn ${isTrial ? 'active' : ''}`}
        aria-label="スタート"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>play_circle</span>
        <span>スタート</span>
      </Link>
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
