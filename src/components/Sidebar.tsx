"use client";

import React, { useState } from 'react';
import { useProgress } from '@/hooks/useProgress';
import { 
  Home, 
  RocketLaunch, 
  Flag, 
  Assignment, 
  PlayArrow, 
  RateReview,
  ListAlt,
  GpsFixed
} from '@mui/icons-material';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedCourse?: string;
  expanded?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, selectedCourse, expanded = false, onClose }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const { progress, loading } = useProgress();

  // サブメニュー外をクリックしたら閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openSubMenu && !target.closest('.submenu-container')) {
        setOpenSubMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openSubMenu]);

  const menuItems = [
    { id: 'home', label: 'ホーム', icon: Home, description: 'コース選択' },
    { id: 'start', label: 'スタート', icon: RocketLaunch, description: 'リストアップ・テーマ選択', subItems: [
      { id: 'list-up', label: 'リストアップ', icon: ListAlt },
      { id: 'theme-selection', label: 'テーマ選択', icon: GpsFixed }
    ]},
    { id: 'goals', label: 'ゴール', icon: Flag, description: '目標設定' },
    { id: 'plan', label: '計画', icon: Assignment, description: '計画策定' },
    { id: 'execute', label: '実行', icon: PlayArrow, description: '行動実施' },
    { id: 'reflection', label: '反省', icon: RateReview, description: '振り返り' }
  ];

  const getCourseSpecificLabel = (item: any) => {
    if (selectedCourse === 'aspiration') {
      switch (item.id) {
        case 'list-up':
          return '願望のリストアップ';
        case 'theme-selection':
          return '願望のテーマ選択';
        default:
          return item.label;
      }
    } else if (selectedCourse === 'problem-solving') {
      switch (item.id) {
        case 'list-up':
          return '課題のリストアップ';
        case 'theme-selection':
          return '課題のテーマ選択';
        default:
          return item.label;
      }
    }
    return item.label;
  };

  const handleItemClick = (itemId: string, hasSubItems: boolean = false, shouldClose: boolean = true) => {
    // サブメニューがある場合は開閉をトグル
    if (hasSubItems) {
      const newState = openSubMenu === itemId ? null : itemId;
      setOpenSubMenu(newState);
      return;
    }

    const tabMapping: { [key: string]: string } = {
      'home': 'home',
      'list-up': 'list-up',
      'theme-selection': 'theme-selection',
      'goals': 'goals',
      'plan': 'pdca-analysis',
      'execute': 'pdca-analysis',
      'reflection': 'reflection'
    };

    const targetTab = tabMapping[itemId] || itemId;
    onTabChange(targetTab);
    
    // サブメニューを閉じる
    setOpenSubMenu(null);
    
    // サブメニューのクリック時はサイドバーを閉じない
    if (shouldClose && onClose) {
      onClose();
    }
  };

  const isActive = (itemId: string) => {
    if (itemId === 'home') return activeTab === 'home';
    if (itemId === 'list-up') return activeTab === 'list-up';
    if (itemId === 'theme-selection') return activeTab === 'theme-selection';
    if (itemId === 'goals') return activeTab === 'goals';
    if (itemId === 'plan' || itemId === 'execute') return activeTab === 'pdca-analysis';
    if (itemId === 'reflection') return activeTab === 'reflection';
    return false;
  };

  const isEnabled = (itemId: string) => {
    if (loading) return false;
    
    switch (itemId) {
      case 'home':
        return progress.home;
      case 'start':
      case 'list-up':
      case 'theme-selection':
        return progress.start;
      case 'goals':
        return progress.goals;
      case 'plan':
      case 'execute':
        return progress.plan;
      case 'reflection':
        return progress.reflection;
      default:
        return false;
    }
  };

  const getItemStyle = (itemId: string) => {
    const enabled = isEnabled(itemId);
    const active = isActive(itemId);
    
    if (!enabled) {
      return 'text-gray-400 cursor-not-allowed';
    }
    
    if (active) {
      return 'text-blue-700';
    }
    
    return 'text-gray-700 hover:text-blue-700';
  };

  // JSベースのホバー制御は使用しない（CSSのgroup-hoverで制御）

  // JSベースのポップアップ描画は廃止（下部で常駐DOMとして描画）

  return (
    <>
      {/* クローズ状態: アイコン＋小テキストの縦ナビ（常時表示） */}
      <div className="w-20 bg-white shadow-lg border-r border-gray-200 h-screen fixed top-[45px] left-0 flex flex-col items-center py-6 space-y-6 overflow-visible">
        {menuItems.map((item) => (
          <div key={item.id} className="relative w-full flex flex-col items-center group submenu-container">
            <button
              onClick={() => {
                if (item.subItems) {
                  handleItemClick(item.id, true);
                } else if (isEnabled(item.id)) {
                  handleItemClick(item.id, false);
                }
              }}
              className={`flex flex-col items-center justify-center w-full ${getItemStyle(item.id)}`}
              title={isEnabled(item.id) ? item.label : `${item.label} (未完了の前段階があります)`}
              disabled={!isEnabled(item.id) && !item.subItems}
            >
              <item.icon className="text-2xl" />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
            {/* ホバー時またはクリック時にポップアップ表示 */}
            <div 
              className={`submenu-container absolute left-full top-1/2 -translate-y-1/2 ml-0 bg-white border-2 border-blue-500 rounded-lg shadow-xl p-3 min-w-[160px] transition-all ${
                openSubMenu === item.id ? 'opacity-100 pointer-events-auto visible z-[9999]' : 'opacity-0 pointer-events-none invisible z-50 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:visible'
              }`}
              style={{ left: '100%', marginLeft: '4px' }}
            >
              <div className="text-sm font-medium text-gray-800 mb-1">{item.label}</div>
              <div className="text-xs text-gray-500 mb-2">{item.description}</div>
              {item.id === 'start' && item.subItems ? (
                <div className="space-y-1">
                  {item.subItems.map((subItem: any) => (
                    <button
                      key={subItem.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(subItem.id, false, false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
                    >
                      {getCourseSpecificLabel(subItem)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">サブメニューなし</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* オープン状態: スライドアウトの詳細メニュー */}
      {expanded && (
        <div className="fixed inset-0 z-60">
          {/* 背景（右側は透過） */}
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-black bg-opacity-30" onClick={onClose} />
          <div className="absolute left-[300px] top-0 bottom-0 right-0" onClick={onClose} />

          {/* パネル */}
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl border-r border-gray-200 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">メニュー</h2>
              <button className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm" onClick={onClose}>閉じる ×</button>
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => isEnabled(item.id) && handleItemClick(item.id, !!item.subItems)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      !isEnabled(item.id)
                        ? 'text-gray-400 cursor-not-allowed'
                        : isActive(item.id)
                        ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    disabled={!isEnabled(item.id)}
                  >
                    <item.icon className="mr-3 text-lg" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </button>

                  {item.subItems && isEnabled('start') && (progress.selectedCourse === 'aspiration' || progress.selectedCourse === 'problem-solving') && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => handleItemClick(subItem.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                            isActive(subItem.id)
                              ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-400'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <subItem.icon className="mr-2 text-sm" />
                          <span>{getCourseSpecificLabel(subItem)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
