"use client";

import React, { useState } from 'react';
import { Support, ExpandLess, Close } from '@mui/icons-material';
import InfoArea from './InfoArea';

interface SupportSlideBarProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep?: string;
  userType?: 'aspiration' | 'problem';
}

const SupportSlideBar: React.FC<SupportSlideBarProps> = ({
  isOpen,
  onClose,
  currentStep = 'list-up',
  userType = 'aspiration'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);

  // タッチイベントハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (startY === null || currentY === null) {
      setStartY(null);
      setCurrentY(null);
      return;
    }

    const deltaY = startY - currentY;
    
    // 上方向に50px以上スワイプしたら展開
    if (deltaY > 50) {
      setIsExpanded(true);
    }
    // 下方向に50px以上スワイプしたら縮小
    else if (deltaY < -50 && isExpanded) {
      setIsExpanded(false);
    }

    setStartY(null);
    setCurrentY(null);
  };

  // クリックでトグル
  const handleHeaderClick = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* モーダル背景（展開時のみ） */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* スライドバー */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 transition-all duration-300 ${
          isExpanded ? 'z-50 h-[70vh]' : 'z-40 h-[60px]'
        }`}
      >
        {/* ヘッダー（スワイプ可能） */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-200 cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleHeaderClick}
        >
          {/* スワイプインジケーター */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full" />
          
          <div className="flex items-center space-x-2 mt-2">
            <Support className="text-blue-600 w-5 h-5" />
            <h3 className="text-sm font-medium text-gray-800">サポート情報</h3>
          </div>
          
          <div className="flex items-center space-x-1 mt-2">
            {isExpanded ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="閉じる"
              >
                <Close className="text-gray-500 w-5 h-5" />
              </button>
            ) : (
              <ExpandLess className="text-gray-500 w-5 h-5" />
            )}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="h-[calc(100%-52px)] overflow-y-auto">
          <div className="p-4">
            <InfoArea 
              currentStep={currentStep}
              userType={userType}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SupportSlideBar;

