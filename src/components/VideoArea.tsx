"use client";

import React, { useState, useRef, useEffect } from 'react';
import { VideoCall, PlayArrow, Fullscreen, FullscreenExit } from '@mui/icons-material';
import ZoomVideoSDK from './ZoomVideoSDK';
import VideoLinkPlayer from './VideoLinkPlayer';

interface VideoAreaProps {
  className?: string;
}

type VideoMode = 'zoom' | 'video-link';

const VideoArea: React.FC<VideoAreaProps> = ({ className = '' }) => {
  const [videoMode, setVideoMode] = useState<VideoMode>('zoom');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleModeChange = (mode: VideoMode) => {
    setVideoMode(mode);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <VideoCall className="text-blue-600" />
          <h3 className="text-sm font-medium text-gray-800">動画エリア</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={isExpanded ? '縮小' : '拡大'}
        >
          {isExpanded ? (
            <FullscreenExit className="text-gray-500" />
          ) : (
            <Fullscreen className="text-gray-500" />
          )}
        </button>
      </div>

      {/* モード切り替えボタン */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleModeChange('zoom')}
          className={`flex-1 flex items-center justify-center py-2 px-3 text-sm font-medium transition-colors ${
            videoMode === 'zoom'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <VideoCall className="mr-1 text-sm" />
          Zoom
        </button>
        <button
          onClick={() => handleModeChange('video-link')}
          className={`flex-1 flex items-center justify-center py-2 px-3 text-sm font-medium transition-colors ${
            videoMode === 'video-link'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <PlayArrow className="mr-1 text-sm" />
          動画リンク
        </button>
      </div>

      {/* 動画コンテンツ */}
      <div className={`transition-all duration-300 ${isExpanded ? 'h-96' : 'h-48'}`}>
        {videoMode === 'zoom' ? (
          <ZoomVideoSDK />
        ) : (
          <VideoLinkPlayer />
        )}
      </div>
    </div>
  );
};

export default VideoArea;
