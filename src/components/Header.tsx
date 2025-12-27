"use client";

import React, { useState } from 'react';
import { Menu, Support, VideoCall, AccountCircle, Settings, Logout } from '@mui/icons-material';

interface HeaderProps {
  onSignOut?: () => void;
  selectedCourse?: string;
  onToggleSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  onToggleVideoZoom?: () => void;
  user?: {
    uid?: string;
    photoURL?: string | null;
    displayName?: string | null;
    email?: string | null;
  } | null;
}

const Header: React.FC<HeaderProps> = ({ 
  onSignOut, 
  selectedCourse, 
  onToggleSidebar, 
  onToggleRightSidebar,
  onToggleVideoZoom,
  user
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    }
    setShowAccountMenu(false);
  };

  const handleToggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleToggleRightSidebar = () => {
    if (onToggleRightSidebar) {
      onToggleRightSidebar();
    }
  };

  const handleToggleVideoZoom = () => {
    if (onToggleVideoZoom) {
      onToggleVideoZoom();
    }
  };

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-3">
        {/* 上段: アイコン類 + タイトル + アカウント設定 */}
        <div className="flex justify-between items-center h-[45px]">
          {/* 左側: ハンバーガーメニュー + タイトル */}
          <div className="flex items-center space-x-2">
            {/* ハンバーガーメニュー（スマホ/タブレットで表示） */}
            <button 
              className="p-1.5 text-gray-600 hover:text-gray-900 md:hidden" 
              onClick={handleToggleSidebar}
              title="メニュー"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* タイトル（2行表示） - アイコンの高さに揃える */}
            <div className="text-center">
              <div className="text-xs font-bold text-gray-900 leading-tight">
                人生学び場
              </div>
              <div className="text-xs font-bold text-gray-900 leading-tight">
                こころ道場
              </div>
            </div>
            {selectedCourse && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hidden sm:inline-block">
                {selectedCourse}
              </span>
            )}
          </div>

          {/* 右側: 動画/Zoom、サポート、ログインアイコン */}
          <div className="flex items-center space-x-1">
            {/* 動画/Zoomアイコン */}
            <button 
              className="p-1.5 text-gray-600 hover:text-gray-900" 
              onClick={handleToggleVideoZoom}
              title="動画/Zoom"
            >
              <VideoCall className="w-5 h-5" />
            </button>
            
            {/* サポートアイコン */}
            <button 
              className="p-1.5 text-gray-600 hover:text-gray-900" 
              onClick={handleToggleRightSidebar}
              title="サポート情報"
            >
              <Support className="w-5 h-5" />
            </button>
            
            {/* ログインアイコン */}
            <div className="relative">
              <button 
                onClick={toggleAccountMenu}
                className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                title="アカウント設定"
              >
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="プロフィール" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <AccountCircle className="w-6 h-6" />
                )}
              </button>

              {/* アカウント設定ポップアップ */}
              {showAccountMenu && (
                <>
                  {/* 背景オーバーレイ */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAccountMenu(false)}
                  />
                  
                  {/* ポップアップメニュー */}
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {user?.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt="プロフィール" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <AccountCircle className="w-8 h-8 text-gray-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user?.displayName || 'ユーザー'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <Settings className="w-4 h-4 mr-2" />
                        アカウント設定
                      </button>
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Logout className="w-4 h-4 mr-2" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

