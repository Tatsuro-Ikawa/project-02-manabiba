'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TERMS_VERSION, PRIVACY_VERSION, hasAcceptedCurrentConsents } from '@/lib/consent';
import { updateUserConsents } from '@/lib/firestore';
import { ConsentLegalScrollPanel } from '@/components/consent/ConsentLegalScrollPanel';

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

  const [legalRead, setLegalRead] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScrollEndReached = useCallback(() => {
    setLegalRead(true);
  }, []);

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

  const canSubmit = legalRead && agreeTerms && agreePrivacy && !saving;

  const handleSubmit = async () => {
    if (!user) return;
    if (!legalRead || !agreeTerms || !agreePrivacy) return;
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ fontFamily: 'var(--font-family-jp)' }}>
      <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">ご利用にあたっての確認</h1>
        <p className="text-sm text-gray-600 mb-4">
          まず下の枠内の<strong>利用規約・プライバシーポリシー（ダミー条文）</strong>を末尾までスクロールしてお読みください。
          続けてチェックボックスに同意のうえ、「同意して続ける」を押してください。
        </p>
        <p className="text-xs text-gray-500 mb-4">
          別タブの
          <Link href="/terms" className="text-blue-600 hover:underline mx-0.5" target="_blank" rel="noopener noreferrer">
            利用規約ページ
          </Link>
          ・
          <Link href="/privacy" className="text-blue-600 hover:underline mx-0.5" target="_blank" rel="noopener noreferrer">
            プライバシーポリシーページ
          </Link>
          もご参照いただけます（現在はプレースホルダの場合があります）。
        </p>

        <ConsentLegalScrollPanel onScrollEndReached={handleScrollEndReached} />

        <fieldset className="space-y-3 mb-5 border-0 p-0 m-0" disabled={!legalRead}>
          <legend className="sr-only">同意（条文をスクロールして読了後に選択）</legend>
          <div className="flex items-start gap-3">
            <input
              id="agree-terms"
              type="checkbox"
              className="mt-1"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              disabled={!legalRead}
            />
            <label htmlFor="agree-terms" className={`text-sm ${legalRead ? 'text-gray-800' : 'text-gray-400'}`}>
              上記の利用規約（ダミー含む、版: {TERMS_VERSION}）の内容を確認し、同意します。
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input
              id="agree-privacy"
              type="checkbox"
              className="mt-1"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              disabled={!legalRead}
            />
            <label htmlFor="agree-privacy" className={`text-sm ${legalRead ? 'text-gray-800' : 'text-gray-400'}`}>
              上記のプライバシーポリシー（ダミー含む、版: {PRIVACY_VERSION}）の内容を確認し、同意します。
            </label>
          </div>
        </fieldset>

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
