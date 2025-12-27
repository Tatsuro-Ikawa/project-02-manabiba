"use client";

import React, { useState, useRef, useEffect } from 'react';
import { VideoCall, PersonAdd, Person } from '@mui/icons-material';

// 動的インポート用の型定義
interface ZoomUIToolkit {
  joinSession: (container: HTMLElement, config: any) => void;
  onSessionClosed: (callback: () => void) => void;
  onSessionDestroyed: (callback: () => void) => void;
  leaveSession: () => void;
  destroy: () => void;
}

interface CustomizationOptions {
  videoSDKJWT: string;
  sessionName: string;
  userName: string;
  sessionPasscode: string;
  featuresOptions: {
    preview: { enable: boolean };
    virtualBackground: { 
      enable: boolean;
      virtualBackgrounds: Array<{ url: string }>;
    };
  };
}

const ZoomVideoSDK: React.FC = () => {
  const sessionContainerRef = useRef<HTMLDivElement>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState(1); // 1: Host, 0: Participant
  const [sessionName, setSessionName] = useState('ManabibaSession');
  const [userName, setUserName] = useState('User');
  const [uitoolkit, setUitoolkit] = useState<ZoomUIToolkit | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 認証エンドポイント（既存のVercelサーバを使用）
  const authEndpoint = "https://videosdk-auth-endpoint-sample-woad.vercel.app";

  // 動的インポートでZoom Video SDK UI Toolkitを読み込み
  useEffect(() => {
    const loadZoomSDK = async () => {
      try {
        // ブラウザ環境でのみ実行
        if (typeof window !== 'undefined') {
          const zoomSDK = await import('@zoom/videosdk-ui-toolkit');
          
          // CSSファイルを動的に読み込み
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://source.zoom.us/videosdk-ui-toolkit/2.2.10-1/videosdk-ui-toolkit.css';
          document.head.appendChild(link);
          
          setUitoolkit(zoomSDK.default);
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Zoom SDK loading error:', err);
      }
    };

    loadZoomSDK();
  }, []);

  const config: CustomizationOptions = {
    videoSDKJWT: "",
    sessionName: sessionName,
    userName: userName,
    sessionPasscode: "manabiba123",
    featuresOptions: {
      preview: {
        enable: true,
      },
      virtualBackground: {
        enable: true,
        virtualBackgrounds: [
          {
            url: "https://images.unsplash.com/photo-1715490187538-30a365fa05bd?q=80&w=1945&auto=format&fit=crop",
          },
        ],
      },
    },
  };

  const getVideoSDKJWT = async () => {
    if (!sessionContainerRef.current || !uitoolkit) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: config.sessionName,
          role: role,
          videoWebRtcMode: 1,
        }),
      });

      const data = await response.json();
      
      if (data.signature) {
        config.videoSDKJWT = data.signature;
        joinSession();
      } else {
        console.error('JWT取得エラー:', data);
        alert('セッションに参加できませんでした。');
      }
    } catch (error) {
      console.error('認証エラー:', error);
      alert('認証に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const joinSession = () => {
    if (!sessionContainerRef.current || !uitoolkit) return;
    
    try {
      uitoolkit.joinSession(sessionContainerRef.current, config);
      uitoolkit.onSessionClosed(sessionClosed);
      uitoolkit.onSessionDestroyed(sessionDestroyed);
      setIsJoined(true);
    } catch (error) {
      console.error('セッション参加エラー:', error);
      alert('セッションに参加できませんでした。');
    }
  };

  const sessionClosed = () => {
    console.log("セッションが終了しました");
    setIsJoined(false);
  };

  const sessionDestroyed = () => {
    console.log("セッションが破棄されました");
    if (uitoolkit) {
      uitoolkit.destroy();
    }
    setIsJoined(false);
  };

  const leaveSession = () => {
    if (isJoined && uitoolkit) {
      uitoolkit.leaveSession();
    }
  };

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (isJoined && uitoolkit) {
        uitoolkit.destroy();
      }
    };
  }, [isJoined, uitoolkit]);

  return (
    <div className="h-full flex flex-col">
      {!isJoined ? (
        <div className="flex-1 p-4 space-y-4">
          <div className="text-center">
            <VideoCall className="mx-auto text-4xl text-blue-600 mb-2" />
            <h4 className="text-sm font-medium text-gray-800 mb-1">Zoom Video SDK</h4>
            <p className="text-xs text-gray-500">セッションに参加してビデオ通話を開始</p>
          </div>

          {/* セッション設定 */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                セッション名
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="セッション名を入力"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ユーザー名
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ユーザー名を入力"
              />
            </div>

            {/* ロール選択 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                ロール
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={role === 1}
                    onChange={() => setRole(1)}
                    className="mr-1"
                  />
                  <PersonAdd className="mr-1 text-xs" />
                  <span className="text-xs">ホスト</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={role === 0}
                    onChange={() => setRole(0)}
                    className="mr-1"
                  />
                  <Person className="mr-1 text-xs" />
                  <span className="text-xs">参加者</span>
                </label>
              </div>
            </div>
          </div>

          {/* 参加ボタン */}
          <button
            onClick={getVideoSDKJWT}
            disabled={isLoading || !sessionName.trim() || !userName.trim() || !isInitialized}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '参加中...' : isInitialized ? 'セッションに参加' : 'SDK読み込み中...'}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* セッション制御 */}
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                <span className="font-medium">{sessionName}</span> - {userName}
              </div>
              <button
                onClick={leaveSession}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                退出
              </button>
            </div>
          </div>
          
          {/* Zoom Video SDK コンテナ */}
          <div 
            ref={sessionContainerRef}
            className="flex-1 w-full"
            style={{ minHeight: '200px' }}
          />
        </div>
      )}
    </div>
  );
};

export default ZoomVideoSDK;
