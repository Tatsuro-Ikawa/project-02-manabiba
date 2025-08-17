'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/mypage');
    }
  }, [user, loading, router]);

  const handleLoginClick = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-8">
          人生学び場
        </h1>
        <h2 className="text-3xl md:text-5xl font-bold text-indigo-600 mb-12">
          こころ道場
        </h2>
        
        <button
          onClick={handleLoginClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          ログイン
        </button>
      </div>
    </div>
  );
}
