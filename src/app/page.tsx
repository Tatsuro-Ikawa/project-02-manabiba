'use client';

import { Suspense } from 'react';
import HomePage from '@/components/HomePage';

/**
 * ホームページ（/）
 * 認証は未実装のため、表示切替はモック（URL ?logged_in=true または state）で行う。
 */
export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>読み込み中...</div>}>
      <HomePage />
    </Suspense>
  );
}
