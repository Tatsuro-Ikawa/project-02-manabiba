'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import {
  isFirstTimeOnboardingNext,
  isPreOnboardingUser,
  landingWithNeedsConsent,
  normalizeAuthNext,
} from '@/lib/onboardingFlow';

function PostLoginContent() {
  const { user, userProfile, loading } = useAuth();
  const { bundle, loading: legalLoading } = useLegalDocuments();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeAuthNext(searchParams.get('next')), [searchParams]);

  useEffect(() => {
    if (loading || legalLoading || !bundle) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/post-login?next=${nextPath}`)}`);
      return;
    }

    if (!userProfile) return;

    if (!hasAcceptedCurrentConsents(userProfile, bundle.terms.version, bundle.privacy.version)) {
      // 初回入会（コース未選択）: 同意前にランディングでコース選択（NG_02）。
      if (nextPath === '/' && isPreOnboardingUser(userProfile)) {
        router.replace(landingWithNeedsConsent('/'));
        return;
      }
      // 再ログイン（コース選択済み・未同意のみ）: 同意→ホーム。
      if (nextPath === '/') {
        router.replace(`/consent?next=${encodeURIComponent('/')}`);
        return;
      }
      if (isFirstTimeOnboardingNext(nextPath)) {
        router.replace(landingWithNeedsConsent(nextPath));
        return;
      }
      router.replace(`/consent?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    router.replace(nextPath);
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

