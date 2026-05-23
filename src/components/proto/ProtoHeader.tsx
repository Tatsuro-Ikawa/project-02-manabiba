'use client';

import Link from 'next/link';
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import { useRouter } from 'next/navigation';

interface ProtoHeaderProps {
  /** ログイン風表示（モック） */
  loggedIn?: boolean;
  /** モバイル時: サイドバーが開いているか */
  sidebarOpen?: boolean;
  /** モバイル時: ハンバーガーメニュー押下でサイドバー開閉 */
  onToggleSidebar?: () => void;
}

export default function ProtoHeader({
  sidebarOpen = false,
  onToggleSidebar,
}: ProtoHeaderProps) {
  const pathname = usePathname();
  const { userProfile, user, signOut } = useAuth();
  const { mode, availableModes, setMode } = useViewMode();
  const router = useRouter();
  const roleLabel = userProfile?.role ?? 'guest';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleToggleMenu = useCallback(() => {
    if (!user) return;
    setMenuOpen((v) => !v);
  }, [user]);

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    router.push('/');
  };

  const headerTitle = (() => {
    if (pathname.startsWith('/start-program')) {
      return { text: '7日間スタートプログラム', showReg: false };
    }
    if (
      pathname === '/trial_4w' ||
      (pathname.startsWith('/trial_4w/') && !pathname.startsWith('/trial_4w/landing'))
    ) {
      return { text: '気づきノート', showReg: false };
    }
    return { text: '人生学び場　こころ道場', showReg: true };
  })();

  return (
    <header className="proto-header">
      <div className="header-left">
        <button
          type="button"
          className="sidebar-toggle-btn"
          aria-label={sidebarOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
          title="メニュー（ホーム・スタート・実行・マイページ等）"
        >
          <span className="material-symbols-outlined" aria-hidden>
            {sidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>
      <h1>
        {headerTitle.text}
        {headerTitle.showReg ? (
          <sup className="trade-reg-mark" title="登録商標">
            ®
          </sup>
        ) : null}
      </h1>
      <div className="header-right">
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={handleToggleMenu}
                className="proto-user-avatar"
                aria-label="ユーザーメニューを開く"
              >
                {user.photoURL ? (
                  // マイページと同じサイズのアバター画像
                  // （スタイルは home-trial.css の .proto-user-avatar に統一）
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'avatar'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center rounded-full bg-gray-300 text-sm">
                    {(user.displayName || user.email || '?').charAt(0)}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg text-xs text-gray-800 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="font-semibold mb-1">アカウント</div>
                    <div>ロール: {roleLabel}</div>
                    {userProfile?.email && <div className="text-[10px] text-gray-500 break-all">{userProfile.email}</div>}
                  </div>
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="font-semibold mb-1">表示モード</div>
                    {availableModes.length <= 1 ? (
                      <div className="text-gray-600">
                        {mode === 'client'
                          ? 'クライアント'
                          : mode === 'coach'
                          ? 'コーチ'
                          : '管理者'}
                      </div>
                    ) : (
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as any)}
                        className="w-full border rounded px-1 py-0.5 text-xs"
                      >
                        {availableModes.map((m) => (
                          <option key={m} value={m}>
                            {m === 'client' ? 'クライアント' : m === 'coach' ? 'コーチ' : '管理者'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="px-3 py-2 flex flex-col gap-1">
                    <Link
                      href="/mypage"
                      className="flex items-center gap-1 text-left text-blue-600 hover:underline"
                      onClick={handleCloseMenu}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        settings
                      </span>
                      <span>アカウント設定</span>
                    </Link>
                    <Link
                      href="/terms"
                      className="flex items-center gap-1 text-left text-blue-600 hover:underline"
                      onClick={handleCloseMenu}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        description
                      </span>
                      <span>利用規約</span>
                    </Link>
                    <Link
                      href="/privacy"
                      className="flex items-center gap-1 text-left text-blue-600 hover:underline"
                      onClick={handleCloseMenu}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        policy
                      </span>
                      <span>プライバシーポリシー</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-1 text-left text-red-600 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        logout
                      </span>
                      <span>ログアウト</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span
              className="proto-guest-icon"
              role="img"
              aria-label="未ログイン"
              title="未ログイン"
            >
              <span className="material-symbols-outlined" aria-hidden>
                person
              </span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
