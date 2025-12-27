"use client";

import React, { useState } from 'react';
import { VideoCall, PlayArrow, ExpandMore, ExpandLess, Close } from '@mui/icons-material';
import ZoomVideoSDK from './ZoomVideoSDK';
import VideoLinkPlayer from './VideoLinkPlayer';
import {
  HIERARCHY_ATTRIBUTES,
  COMPONENT_ATTRIBUTES,
  RESPONSIVE_ATTRIBUTES,
  LAYOUT_ATTRIBUTES,
  STATE_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  ID_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface VideoZoomToggleProps {
  isOpen: boolean;
  onClose: () => void;
  layout?: 'work-area' | 'sidebar'; // work-area: スマホ/タブレット/PC, sidebar: ノートPC
  className?: string;
}

type VideoMode = 'zoom' | 'video-link';

const VideoZoomToggle: React.FC<VideoZoomToggleProps> = ({ 
  isOpen, 
  onClose, 
  layout = 'work-area',
  className = '' 
}) => {
  const [videoMode, setVideoMode] = useState<VideoMode>('zoom');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  const handleModeChange = (mode: VideoMode) => {
    setVideoMode(mode);
  };

  // ワークエリアレイアウト（スマホ/タブレット/PC 1280px以上）
  if (layout === 'work-area') {
    const workAreaAttrs = createDataAttributes({
      'data-id': ID_ATTRIBUTES.VIDEO_ZOOM_TOGGLE,
      'data-hierarchy': HIERARCHY_ATTRIBUTES.APP_VIDEO_ZOOM,
      'data-component': COMPONENT_ATTRIBUTES.VIDEO_ZOOM_TOGGLE,
      'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES,
      'data-layout': LAYOUT_ATTRIBUTES.FIXED_HEADER,
      'data-state': isExpanded ? STATE_ATTRIBUTES.EXPANDED : STATE_ATTRIBUTES.COLLAPSED,
      'data-function': FUNCTION_ATTRIBUTES.VIDEO_PLAYER
    });

    return (
      <div 
        {...workAreaAttrs}
        className={`fixed top-[45px] bg-white border-b border-gray-200 z-40 transition-all duration-300 ${
          isExpanded ? 'h-[400px]' : 'h-[72px] md:h-[115px]'
        } left-0 right-0 md:ml-20 ${className}`} style={{ maxWidth: '900px' }}
      >
        {/* 初期状態: サムネイル + スモールボタン */}
        {!isExpanded && (
          <div 
            id="video-thumbnail-collapsed"
            {...createDataAttributes({
              'data-content': CONTENT_ATTRIBUTES.VIDEO_THUMBNAIL,
              'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER,
              'data-state': STATE_ATTRIBUTES.COLLAPSED
            })}
            className="py-[4px] px-3 md:px-6 h-[72px] md:h-[115px] bg-gray-100"
          >
            {/* 内側コンテンツ全体（白背景） */}
            <div className="flex items-center justify-between h-full bg-white rounded px-3">
            {/* サムネイル動画エリア */}
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.VIDEO_THUMBNAIL,
                'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER
              })}
              className="flex items-center space-x-3 flex-1"
            >
              {/* ダミーサムネイル画像 */}
              <div 
                {...createDataAttributes({
                  'data-content': CONTENT_ATTRIBUTES.THUMBNAIL_IMAGE,
                  'data-state': STATE_ATTRIBUTES.PLACEHOLDER
                })}
                className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center"
              >
                <PlayArrow className="w-6 h-6 text-gray-500" />
              </div>
              
              {/* 動画情報 */}
              <div 
                {...createDataAttributes({
                  'data-content': CONTENT_ATTRIBUTES.VIDEO_DETAIL
                })}
                className="flex-1"
              >
                <div className="text-sm font-medium text-gray-800">
                  {videoMode === 'zoom' ? 'Zoom セッション' : '動画コンテンツ'}
                </div>
                <div className="text-xs text-gray-500">
                  {videoMode === 'zoom' ? '参加者: 3名' : '再生時間: 15:30'}
                </div>
              </div>
            </div>

            {/* スモールボタン群 */}
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.BUTTON_GROUP,
                'data-function': FUNCTION_ATTRIBUTES.VIDEO_PLAYER
              })}
              className="flex flex-col space-y-1"
            >
              <button
                {...createDataAttributes({
                  'data-content': CONTENT_ATTRIBUTES.MODE_SWITCH,
                  'data-interaction': INTERACTION_ATTRIBUTES.CLICKABLE,
                  'data-state': videoMode === 'zoom' ? STATE_ATTRIBUTES.ACTIVE : STATE_ATTRIBUTES.INACTIVE
                })}
                onClick={() => handleModeChange('zoom')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  videoMode === 'zoom'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Zoom
              </button>
              <button
                {...createDataAttributes({
                  'data-content': CONTENT_ATTRIBUTES.MODE_SWITCH,
                  'data-interaction': INTERACTION_ATTRIBUTES.CLICKABLE,
                  'data-state': videoMode === 'video-link' ? STATE_ATTRIBUTES.ACTIVE : STATE_ATTRIBUTES.INACTIVE
                })}
                onClick={() => handleModeChange('video-link')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  videoMode === 'video-link'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                動画
              </button>
            </div>

            {/* 詳細・閉じるボタン（上下入れ替え） */}
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.BUTTON_GROUP,
                'data-interaction': INTERACTION_ATTRIBUTES.CLICKABLE
              })}
              className="flex flex-col space-y-1 ml-2"
            >
              <button
                {...createDataAttributes({
                  'data-interaction': INTERACTION_ATTRIBUTES.CLICKABLE,
                  'data-function': 'close-button'
                })}
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="閉じる"
              >
                <Close className="text-gray-500 w-4 h-4" />
              </button>
              <button
                {...createDataAttributes({
                  'data-interaction': INTERACTION_ATTRIBUTES.CLICKABLE,
                  'data-function': 'expand-button'
                })}
                onClick={() => setIsExpanded(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="詳細を表示"
              >
                <ExpandMore className="text-gray-500 w-4 h-4" />
              </button>
            </div>
            </div>
          </div>
        )}

        {/* 詳細展開状態 */}
        {isExpanded && (
          <>
            {/* ヘッダー部分 */}
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.HEADER_CONTENT,
                'data-layout': LAYOUT_ATTRIBUTES.FLEX_BETWEEN,
                'data-state': STATE_ATTRIBUTES.EXPANDED
              })}
              className="flex items-center justify-between px-3 md:px-6 py-1 border-b border-gray-200 h-[45px]"
            >
              <div className="flex items-center space-x-2">
                <VideoCall className="text-blue-600 w-5 h-5" />
                <h3 className="text-sm font-medium text-gray-800">動画 / Zoom</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="縮小"
                >
                  <ExpandLess className="text-gray-500 w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="閉じる"
                >
                  <Close className="text-gray-500 w-5 h-5" />
                </button>
              </div>
            </div>

            {/* モード切替ボタン */}
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.MODE_SWITCH,
                'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER
              })}
              className="flex border-b border-gray-200 h-[42px] px-3 md:px-6"
            >
              <button
                onClick={() => handleModeChange('zoom')}
                className={`flex-1 flex items-center justify-center py-2 px-3 text-xs font-medium transition-colors ${
                  videoMode === 'zoom'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <VideoCall className="mr-1 w-4 h-4" />
                Zoom
              </button>
              <button
                onClick={() => handleModeChange('video-link')}
                className={`flex-1 flex items-center justify-center py-2 px-3 text-xs font-medium transition-colors ${
                  videoMode === 'video-link'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PlayArrow className="mr-1 w-4 h-4" />
                動画リンク
              </button>
            </div>

            {/* 動画コンテンツ（スクロール可能、下部まで見えるように調整、行間詰める） */}
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.VIDEO_DETAIL,
                'data-interaction': INTERACTION_ATTRIBUTES.SCROLLABLE
              })}
              className="h-[calc(100%-96px)] overflow-y-auto pb-20"
            >
              <div className="p-3 md:p-6 space-y-2">
                {videoMode === 'zoom' ? (
                  <div className="space-y-1">
                    <ZoomVideoSDK />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <VideoLinkPlayer />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // サイドバーレイアウト（ノートPC 1024-1279px）
  const sidebarAttrs = createDataAttributes({
    'data-hierarchy': HIERARCHY_ATTRIBUTES.APP_VIDEO_ZOOM,
    'data-component': COMPONENT_ATTRIBUTES.VIDEO_ZOOM_TOGGLE,
    'data-responsive': RESPONSIVE_ATTRIBUTES.LAPTOP_ONLY,
    'data-layout': LAYOUT_ATTRIBUTES.SIDEBAR_FIXED,
    'data-state': isExpanded ? STATE_ATTRIBUTES.EXPANDED : STATE_ATTRIBUTES.COLLAPSED,
    'data-function': FUNCTION_ATTRIBUTES.VIDEO_PLAYER
  });

  return (
    <div 
      {...sidebarAttrs}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <VideoCall className="text-blue-600 w-5 h-5" />
          <h3 className="text-sm font-medium text-gray-800">動画 / Zoom</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={isExpanded ? '縮小' : '詳細を表示'}
        >
          {isExpanded ? (
            <ExpandLess className="text-gray-500 w-5 h-5" />
          ) : (
            <ExpandMore className="text-gray-500 w-5 h-5" />
          )}
        </button>
      </div>

      {/* モード切替ボタン */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleModeChange('zoom')}
          className={`flex-1 flex items-center justify-center py-2 px-2 text-xs font-medium transition-colors ${
            videoMode === 'zoom'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <VideoCall className="mr-1 w-4 h-4" />
          Zoom
        </button>
        <button
          onClick={() => handleModeChange('video-link')}
          className={`flex-1 flex items-center justify-center py-2 px-2 text-xs font-medium transition-colors ${
            videoMode === 'video-link'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <PlayArrow className="mr-1 w-4 h-4" />
          動画リンク
        </button>
      </div>

      {/* 動画コンテンツ（16:9比率、幅320pxで高さ180px） */}
      <div className={`transition-all duration-300 overflow-hidden ${
        isExpanded ? 'max-h-[500px]' : 'max-h-[180px]'
      }`}>
        <div className="aspect-video w-full">
          {videoMode === 'zoom' ? (
            <ZoomVideoSDK />
          ) : (
            <VideoLinkPlayer />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoZoomToggle;

