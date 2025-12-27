"use client";

import React, { useState } from 'react';
import { PlayArrow, Link, YouTube, VideoLibrary } from '@mui/icons-material';

interface VideoLink {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'vimeo' | 'other';
  thumbnail?: string;
}

const VideoLinkPlayer: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoLink | null>(null);
  const [customUrl, setCustomUrl] = useState('');

  // サンプル動画リンク
  const sampleVideos: VideoLink[] = [
    {
      id: '1',
      title: '自己理解の進め方',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      type: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    },
    {
      id: '2',
      title: '目標設定のコツ',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      type: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    },
    {
      id: '3',
      title: 'PDCAサイクルの実践',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      type: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    }
  ];

  const handleVideoSelect = (video: VideoLink) => {
    setSelectedVideo(video);
  };

  const handleCustomUrlSubmit = () => {
    if (customUrl.trim()) {
      const video: VideoLink = {
        id: 'custom',
        title: 'カスタム動画',
        url: customUrl,
        type: 'other'
      };
      setSelectedVideo(video);
    }
  };

  const getVideoEmbedUrl = (url: string, type: string) => {
    if (type === 'youtube') {
      const videoId = url.includes('embed/') ? url.split('embed/')[1] : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const getVideoIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <YouTube className="text-red-600" />;
      case 'vimeo':
        return <VideoLibrary className="text-blue-600" />;
      default:
        return <PlayArrow className="text-gray-600" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {!selectedVideo ? (
        <div className="flex-1 p-4 space-y-4">
          <div className="text-center">
            <VideoLibrary className="mx-auto text-4xl text-blue-600 mb-2" />
            <h4 className="text-sm font-medium text-gray-800 mb-1">動画リンク</h4>
            <p className="text-xs text-gray-500">学習動画を選択またはURLを入力</p>
          </div>

          {/* サンプル動画一覧 */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-700">推奨動画</h5>
            {sampleVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleVideoSelect(video)}
                className="w-full flex items-center p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {getVideoIcon(video.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {video.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {video.type === 'youtube' ? 'YouTube' : video.type}
                  </p>
                </div>
                <PlayArrow className="text-gray-400" />
              </button>
            ))}
          </div>

          {/* カスタムURL入力 */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-xs font-medium text-gray-700 mb-2">カスタム動画URL</h5>
            <div className="flex space-x-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="動画URLを入力"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleCustomUrlSubmit}
                disabled={!customUrl.trim()}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Link className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* 動画ヘッダー */}
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getVideoIcon(selectedVideo.type)}
                <span className="text-xs font-medium text-gray-800 truncate">
                  {selectedVideo.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
              >
                戻る
              </button>
            </div>
          </div>

          {/* 動画プレーヤー */}
          <div className="flex-1 p-2">
            <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
              {selectedVideo.type === 'youtube' || selectedVideo.type === 'vimeo' ? (
                <iframe
                  src={getVideoEmbedUrl(selectedVideo.url, selectedVideo.type)}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <PlayArrow className="mx-auto text-4xl text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">動画を再生</p>
                    <a
                      href={selectedVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      <Link className="mr-1" />
                      外部で開く
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLinkPlayer;
