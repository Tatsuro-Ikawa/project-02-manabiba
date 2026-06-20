'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import { applyConsentCourseEnrollment, updateUserConsents } from '@/lib/firestore';
import { CONSENT_CANCEL_LANDING, resolveOnboardingDestination } from '@/lib/onboardingFlow';
import { shouldRedirectUnauthenticatedToLogin, signOutAndRedirect } from '@/lib/intentionalSignOut';
import { ConsentLegalScrollPanel } from '@/components/consent/ConsentLegalScrollPanel';

function sanitizeNext(next: string | null): string {
  if (!next) return '/';
  if (next.startsWith('/')) return next;
  return '/';
}

function ConsentContent() {
  const { user, userProfile, loading, refreshUserProfile, signOut } = useAuth();
  const { bundle, loading: legalLoading, error: legalError } = useLegalDocuments();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);

  const [legalRead, setLegalRead] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScrollEndReached = useCallback(() => {
    setLegalRead(true);
  }, []);

  useEffect(() => {
    if (loading || legalLoading || !bundle) return;
    if (!user) {
      if (!shouldRedirectUnauthenticatedToLogin()) return;
      router.replace(`/login?next=${encodeURIComponent(`/consent?next=${nextPath}`)}`);
      return;
    }
    if (userProfile && hasAcceptedCurrentConsents(userProfile, bundle.terms.version, bundle.privacy.version)) {
      router.replace(resolveOnboardingDestination(userProfile, nextPath));
    }
  }, [loading, legalLoading, bundle, user, userProfile, router, nextPath]);

  const handleCancel = async () => {
    setError(null);
    setCancelling(true);
    try {
      await signOutAndRedirect(signOut, router, CONSENT_CANCEL_LANDING);
    } catch (e) {
      console.error('consent cancel signOut error:', e);
      setError('キャンセル処理に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setCancelling(false);
    }
  };

  const canSubmit = legalRead && agreeTerms && agreePrivacy && !saving && !cancelling && !!bundle;

  const handleSubmit = async () => {
    if (!user || !bundle) return;
    if (!legalRead || !agreeTerms || !agreePrivacy) return;
    setError(null);
    setSaving(true);
    try {
      await updateUserConsents(user.uid, {
        termsVersion: bundle.terms.version,
        privacyVersion: bundle.privacy.version,
      });
      await applyConsentCourseEnrollment(user.uid, nextPath);
      await refreshUserProfile();
      router.replace(nextPath);
    } catch (e) {
      console.error('consent save error:', e);
      setError('同意の保存に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setSaving(false);
    }
  };

  if (loading || legalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
        読み込み中...
      </div>
    );
  }

  if (legalError || !bundle) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4" style={{ fontFamily: 'var(--font-family-jp)' }}>
        <p className="text-red-600 text-sm" role="alert">
          {legalError ?? '条文を読み込めませんでした。'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ fontFamily: 'var(--font-family-jp)' }}>
      <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">ご利用にあたっての確認</h1>
        <p className="text-sm text-gray-600 mb-4">
          フリー会員・有料プランを問わず、本サービス利用前に<strong>利用規約とプライバシーポリシーを1回</strong>ご確認いただきます。
          利用規約は7日間プログラム・気づきノートなど<strong>章立て</strong>で記載しています。下の枠を末尾までスクロールし、チェックのうえ「同意して続ける」を押してください。
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
          もご参照いただけます。
        </p>

        <ConsentLegalScrollPanel
          terms={bundle.terms}
          privacy={bundle.privacy}
          onScrollEndReached={handleScrollEndReached}
        />

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
              利用規約（7日間プログラム・気づきノート等を含む、版: {bundle.terms.version}）の内容を確認し、同意します。
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
              プライバシーポリシー（サービス全体共通、版: {bundle.privacy.version}）の内容を確認し、同意します。
            </label>
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '同意して続ける'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving || cancelling}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? 'ログアウト中...' : 'キャンセル（コース選択に戻る）'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          同意しない場合は「キャンセル」で一度ログアウトし、ゲストとしてランディングで別のコースを選べます。
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
