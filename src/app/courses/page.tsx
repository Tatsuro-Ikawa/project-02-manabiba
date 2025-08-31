'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '@/styles/landing.css';

const CourseSelectionPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  // 一時的にマイページにリダイレクト
  React.useEffect(() => {
    if (user) {
      router.push('/mypage');
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">コース選択</h1>
        <p className="text-gray-600 mb-6">
          現在、コース選択機能は準備中です。<br />
          無料でトライできる機能をお試しください。
        </p>
        <Link 
          href="/mypage" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          マイページに戻る
        </Link>
      </div>
    </div>
  );
};

export default CourseSelectionPage;
