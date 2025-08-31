'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LandingPage from '@/components/LandingPage';
import '@/styles/landing.css';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ログイン済みユーザーはマイページにリダイレクト
  useEffect(() => {
    if (!loading && user) {
      router.push('/mypage');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  // 未ログインユーザーにはランディングページを表示
  return <LandingPage />;
}
