'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getClientAnalytics } from '@/lib/analytics';

export default function TestPage() {
  const [status, setStatus] = useState<string>('準備完了');
  const [error, setError] = useState<string>('');
  const [analyticsReady, setAnalyticsReady] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const analytics = await getClientAnalytics();
      setAnalyticsReady(!!analytics);
    })();
  }, []);

  const testFirebaseConnection = () => {
    setStatus('Firebase接続テスト中...');
    setError('');
    
    try {
      console.log('Firebase Auth:', auth);
      console.log('Auth current user:', auth.currentUser);
      setStatus('Firebase接続成功');
    } catch (err) {
      setError(`Firebase接続エラー: ${err}`);
      setStatus('Firebase接続失敗');
    }
  };

  const testGoogleSignIn = async () => {
    setStatus('Googleログインテスト中...');
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setStatus(`ログイン成功: ${result.user?.email ?? 'unknown'}`);
      console.log('ログイン結果:', result);
    } catch (err: any) {
      setError(`ログインエラー: ${err?.message ?? String(err)}`);
      setStatus('ログイン失敗');
      console.error('詳細エラー:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Firebase テスト</h1>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">ステータス: {status}</p>
            {error && (
              <p className="text-sm text-red-600 mt-2">エラー: {error}</p>
            )}
            <p className="text-sm mt-2">Analytics: {analyticsReady ? '初期化済み' : '未対応/未初期化'}</p>
          </div>
          
          <button
            onClick={testFirebaseConnection}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Firebase接続テスト
          </button>
          
          <button
            onClick={testGoogleSignIn}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Googleログインテスト
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">デバッグ情報:</h3>
          <p className="text-sm">現在のユーザー: {auth.currentUser ? auth.currentUser.email || auth.currentUser.uid : 'なし'}</p>
          <p className="text-sm">Auth オブジェクト: {auth ? '存在' : 'なし'}</p>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold mb-2 text-yellow-800">開発用ヒント:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• プライベートモードで動作確認</li>
            <li>• ブラウザ拡張機能を無効化</li>
            <li>• Cookie設定を確認</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 