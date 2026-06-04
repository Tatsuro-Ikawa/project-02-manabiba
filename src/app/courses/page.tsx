'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/** 旧 `/courses` → コース変更画面へ */
export default function CoursesRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/courses/change')}`);
      return;
    }
    router.replace('/courses/change');
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
      読み込み中...
    </div>
  );
}
