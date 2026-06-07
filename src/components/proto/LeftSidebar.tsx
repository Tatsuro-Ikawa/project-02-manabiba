'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isKizukiNoteNavEnabled } from '@/lib/enrollmentCourse';

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

const KIZUKI_NOTE_DISABLED_HINT =
  '7日間スタートプログラム利用中は、気づきノートはご利用いただけません。';

export default function LeftSidebar({
  variant,
  trialTab,
  isOpen = false,
  onClose,
}: LeftSidebarProps) {
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();
  const loggedIn = !loading && !!user;
  const kizukiNoteEnabled = loggedIn && isKizukiNoteNavEnabled(userProfile);

  const isHome = pathname === '/';
  /** 気づきノート（旧トライアル本編）: `/trial_4w` および設定。コース選択ランディングは含めない */
  const isKizukiNote =
    pathname === '/trial_4w' ||
    (pathname.startsWith('/trial_4w/') && !pathname.startsWith('/trial_4w/landing'));
  const isTrialSettings = pathname === '/trial_4w/settings';
  const isStartProgram = pathname.startsWith('/start-program');
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
      {loggedIn ? (
        <Link
          href="/start-program"
          className={`sidebar-btn ${isStartProgram ? 'active' : ''}`}
          aria-label="7日間スタートプログラム"
          onClick={handleNav}
        >
          <span className="material-symbols-outlined" aria-hidden>play_circle</span>
          <span>スタート</span>
        </Link>
      ) : (
        <span
          className={`sidebar-btn sidebar-btn--disabled${isStartProgram ? ' active' : ''}`}
          aria-label="スタート（利用不可）"
          aria-disabled="true"
          title="ログイン後に利用できます。"
        >
          <span className="material-symbols-outlined" aria-hidden>play_circle</span>
          <span>スタート</span>
        </span>
      )}
      {kizukiNoteEnabled ? (
        <Link
          href="/trial_4w"
          className={`sidebar-btn ${isKizukiNote ? 'active' : ''}`}
          aria-label="気づきノート"
          onClick={handleNav}
        >
          <span className="material-symbols-outlined" aria-hidden>edit_note</span>
          <span>ノート</span>
        </Link>
      ) : (
        <span
          className={`sidebar-btn sidebar-btn--disabled${isKizukiNote ? ' active' : ''}`}
          aria-label="気づきノート（利用不可）"
          aria-disabled="true"
          title={loggedIn ? KIZUKI_NOTE_DISABLED_HINT : 'ログイン後に利用できます。'}
        >
          <span className="material-symbols-outlined" aria-hidden>edit_note</span>
          <span>ノート</span>
        </span>
      )}
      <Link
        href="/communication"
        className={`sidebar-btn ${isCommunication ? 'active' : ''}`}
        aria-label="コミュニケーション"
        onClick={handleNav}
      >
        <span className="material-symbols-outlined" aria-hidden>forum</span>
        <span>コミュニケーション</span>
      </Link>
      {isKizukiNote && kizukiNoteEnabled && (
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
    </aside>
  );
}
