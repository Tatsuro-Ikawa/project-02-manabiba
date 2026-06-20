'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import { isPreOnboardingUser, landingWithNeedsConsent, normalizeAuthNext, resolveOnboardingDestination } from '@/lib/onboardingFlow';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';

function PostLoginContent() {
  const { user, userProfile, loading } = useAuth();
  const { bundle, loading: legalLoading } = useLegalDocuments();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeAuthNext(searchParams.get('next')), [searchParams]);

  useEffect(() => {
    if (loading || legalLoading || !bundle) return;

    if (!user) {
      if (!shouldRedirectUnauthenticatedToLogin()) return;
      router.replace(`/login?next=${encodeURIComponent(`/post-login?next=${nextPath}`)}`);
      return;
    }

    if (!userProfile) return;

    if (!hasAcceptedCurrentConsents(userProfile, bundle.terms.version, bundle.privacy.version)) {
      // コース未選択の誤操作（「ログインして続きから」等）のみランディングへ。
      // コース選択済み（login?next=/start-program 等）は同意へ直行（ランディングは1回のみ）。
      if (nextPath === '/' && isPreOnboardingUser(userProfile)) {
        router.replace(landingWithNeedsConsent('/'));
        return;
      }
      router.replace(`/consent?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    router.replace(resolveOnboardingDestination(userProfile, nextPath));
  }, [loading, legalLoading, bundle, user, userProfile, router, nextPath]);

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

