'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TERMS_VERSION, PRIVACY_VERSION, hasAcceptedCurrentConsents } from '@/lib/consent';
import { updateUserConsents } from '@/lib/firestore';

function sanitizeNext(next: string | null): string {
  if (!next) return '/';
  if (next.startsWith('/')) return next;
  return '/';
}

function ConsentContent() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/consent?next=${nextPath}`)}`);
      return;
    }
    if (userProfile && hasAcceptedCurrentConsents(userProfile)) {
      router.replace(nextPath);
    }
  }, [loading, user, userProfile, router, nextPath]);

  const canSubmit = agreeTerms && agreePrivacy && !saving;

  const handleSubmit = async () => {
    if (!user) return;
    if (!agreeTerms || !agreePrivacy) return;
    setError(null);
    setSaving(true);
    try {
      await updateUserConsents(user.uid, { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION });
      await refreshUserProfile();
      router.replace(nextPath);
    } catch (e) {
      console.error('consent save error:', e);
      setError('同意の保存に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ fontFamily: 'var(--font-family-jp)' }}>
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">ご利用にあたっての確認</h1>
        <p className="text-sm text-gray-600 mb-6">
          サービス利用のため、利用規約とプライバシーポリシーをご確認のうえ同意してください。
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3">
            <input
              id="agree-terms"
              type="checkbox"
              className="mt-1"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <label htmlFor="agree-terms" className="text-sm text-gray-800">
              <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                利用規約
              </Link>
              （版: {TERMS_VERSION}）を確認し、同意します。
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input
              id="agree-privacy"
              type="checkbox"
              className="mt-1"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
            />
            <label htmlFor="agree-privacy" className="text-sm text-gray-800">
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                プライバシーポリシー
              </Link>
              （版: {PRIVACY_VERSION}）を確認し、同意します。
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '同意して続ける'}
        </button>

        <p className="text-xs text-gray-500 mt-4">
          同意しない場合はサービスを利用できません。
        </p>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <ConsentContent />
    </Suspense>
  );
}

