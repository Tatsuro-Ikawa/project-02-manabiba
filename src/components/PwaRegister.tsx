'use client';

import { useEffect } from 'react';

/**
 * ブラウザが PWA インストール条件を満たすうえで、登録用 SW を読み込む。
 * キャッシュは行わず、ネットワークへそのまま委譲する（public/sw.js）。
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // 登録失敗はアプリ本体の利用を妨げない
    });
  }, []);

  return null;
}
