'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { hasAcceptedCurrentConsents } from '@/lib/consent';

function sanitizeNext(next: string | null): string {
  if (!next) return '/';
  if (next.startsWith('/')) return next;
  return '/';
}

function PostLoginContent() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/post-login?next=${nextPath}`)}`);
      return;
    }

    if (!userProfile) return;

    if (!hasAcceptedCurrentConsents(userProfile)) {
      router.replace(`/consent?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    router.replace(nextPath);
  }, [loading, user, userProfile, router, nextPath]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
      読み込み中...
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <PostLoginContent />
    </Suspense>
  );
}

