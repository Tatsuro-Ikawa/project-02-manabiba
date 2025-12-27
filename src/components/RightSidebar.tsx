"use client";

import React from 'react';
import { Close } from '@mui/icons-material';
import VideoZoomToggle from './VideoZoomToggle';
import InfoArea from './InfoArea';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep?: string;
  userType?: 'aspiration' | 'problem';
  videoZoomOpen?: boolean;
  onVideoZoomClose?: () => void;
  className?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  onClose,
  currentStep = 'list-up',
  userType = 'aspiration',
  videoZoomOpen = false,
  onVideoZoomClose,
  className = ''
}) => {

  // RightSidebarが閉じていても、ノートPC以上で動画が開いている場合は動画だけ表示
  if (!isOpen && !videoZoomOpen) return null;

  return (
    <>
      {/* タブレット版 (md～lg: 768-1023px) - isOpenのときのみ表示 */}
      {isOpen && (
      <div className={`hidden md:block lg:hidden ${className}`}>
        {/* 背景オーバーレイ（右サイドバー部分のみ） */}
        <div 
          className="fixed right-0 top-[45px] bottom-0 w-80 bg-black bg-opacity-30 z-40"
          onClick={onClose}
        />

        {/* サイドバーパネル（ヘッダー下から表示） */}
        <div className="fixed top-[45px] right-0 bottom-0 w-80 bg-white shadow-xl z-50 overflow-y-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold text-gray-800">サポート情報</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="閉じる"
            >
              <Close className="text-gray-500" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-4 space-y-4">
            {/* 情報提供エリア */}
            <InfoArea 
              currentStep={currentStep}
              userType={userType}
            />
          </div>
        </div>
      </div>
      )}

      {/* ノートPC版 (lg～xl: 1024-1279px) */}
      <div className={`hidden lg:block xl:hidden ${className}`}>
        {/* RightSidebarが閉じていて動画だけ開いている場合 */}
        {!isOpen && videoZoomOpen && (
          <div className="fixed right-0 top-[45px] bottom-0 bg-white shadow-lg border-l border-gray-200 transition-all duration-300 z-30 w-80">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">動画 / Zoom</h3>
              <button
                onClick={() => onVideoZoomClose?.()}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="閉じる"
              >
                <Close className="text-gray-500 w-5 h-5" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="h-full overflow-y-auto pb-20">
              <div className="p-4 space-y-2">
                <VideoZoomToggle
                  isOpen={videoZoomOpen}
                  onClose={() => onVideoZoomClose?.()}
                  layout="sidebar"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 通常のRightSidebar */}
        {isOpen && (
        <div className="fixed right-0 top-[45px] bottom-0 bg-white shadow-lg border-l border-gray-200 transition-all duration-300 z-30 w-80">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">サポートエリア</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="閉じる"
            >
              <Close className="text-gray-500 w-5 h-5" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="h-full overflow-y-auto pb-20">
            <div className="p-4 space-y-4">
              {/* 動画/Zoomエリア（ノートPC専用） */}
              <VideoZoomToggle
                isOpen={videoZoomOpen}
                onClose={() => onVideoZoomClose?.()}
                layout="sidebar"
              />
              
              {/* 情報提供エリア */}
              <InfoArea 
                currentStep={currentStep}
                userType={userType}
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {/* PC版 (xl以上: 1280px以上) */}
      <div className={`hidden xl:block ${className}`}>
        {/* RightSidebarが閉じていて動画だけ開いている場合 */}
        {!isOpen && videoZoomOpen && (
          <div className="fixed right-0 top-[45px] bottom-0 bg-white shadow-lg border-l border-gray-200 transition-all duration-300 z-30 w-80">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">動画 / Zoom</h3>
              <button
                onClick={() => onVideoZoomClose?.()}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="閉じる"
              >
                <Close className="text-gray-500 w-5 h-5" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="h-full overflow-y-auto pb-20">
              <div className="p-4 space-y-2">
                <VideoZoomToggle
                  isOpen={videoZoomOpen}
                  onClose={() => onVideoZoomClose?.()}
                  layout="sidebar"
                />
              </div>
            </div>
          </div>
        )}

        {/* 通常のRightSidebar */}
        {isOpen && (
        <div className="fixed right-0 top-[45px] bottom-0 bg-white shadow-lg border-l border-gray-200 transition-all duration-300 z-30 w-80">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">サポート情報</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="閉じる"
            >
              <Close className="text-gray-500 w-5 h-5" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="h-full overflow-y-auto pb-20">
            <div className="p-4 space-y-4">
              {/* 動画/Zoomエリア（PC専用） */}
              <VideoZoomToggle
                isOpen={videoZoomOpen}
                onClose={() => onVideoZoomClose?.()}
                layout="sidebar"
              />
              
              {/* 情報提供エリア */}
              <InfoArea 
                currentStep={currentStep}
                userType={userType}
              />
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
};

export default RightSidebar;
