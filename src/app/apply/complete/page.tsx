'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { syncCheckoutSessionFromStripe } from '@/lib/client/syncCheckoutSession';
import { NOTE_WELCOME_BACK_LEAD } from '@/lib/subscription/courseReturn';
import '@/styles/subscription-flow.css';

function ApplyCompleteInner() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeBack = searchParams.get('welcomeBack') === '1';
  const sessionId = searchParams.get('session_id')?.trim() || '';
  const [status, setStatus] = useState<'waiting' | 'timeout' | 'sync_error'>('waiting');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pollCount = useRef(0);
  const syncAttempted = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/apply/complete');
      return;
    }

    const plan = userProfile?.subscription?.plan;
    const hasStripe = !!userProfile?.subscription?.stripeSubscriptionId;
    if (hasStripe && (plan === 'standard' || plan === 'premium')) {
      const qs = welcomeBack ? '?welcomeBack=1' : '';
      router.replace(`/trial_4w${qs}`);
      return;
    }

    // Webhook 未達時: session_id から直接同期（1回）
    if (sessionId && !syncAttempted.current) {
      syncAttempted.current = true;
      void (async () => {
        try {
          await syncCheckoutSessionFromStripe(user, sessionId);
          await refreshUserProfile();
        } catch (e) {
          console.error('sync-checkout-session error:', e);
          setSyncError(e instanceof Error ? e.message : '申込内容の同期に失敗しました。');
          setStatus('sync_error');
        }
      })();
      return;
    }

    if (pollCount.current >= 15) {
      setStatus((prev) => (prev === 'sync_error' ? prev : 'timeout'));
      return;
    }

    const timer = window.setTimeout(() => {
      pollCount.current += 1;
      void refreshUserProfile();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [loading, user, userProfile, router, refreshUserProfile, welcomeBack, sessionId]);

  const retrySync = async () => {
    if (!user || !sessionId) return;
    setStatus('waiting');
    setSyncError(null);
    try {
      await syncCheckoutSessionFromStripe(user, sessionId);
      await refreshUserProfile();
    } catch (e) {
      console.error('sync-checkout-session retry error:', e);
      setSyncError(e instanceof Error ? e.message : '申込内容の同期に失敗しました。');
      setStatus('sync_error');
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar variant="home" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <div className="sub-flow-panel">
            <h2 className="sub-flow-title">お支払い手続きありがとうございます</h2>
            {status === 'waiting' && (
              <p className="sub-flow-lead" role="status">
                お申し込み内容を反映しています。しばらくお待ちください…
              </p>
            )}
            {status === 'timeout' && (
              <>
                <p className="sub-flow-lead" role="status">
                  反映に少し時間がかかっています。1〜2分後に気づきノート画面を開いてください。
                </p>
                {welcomeBack ? (
                  <p className="sub-flow-welcome-back">{NOTE_WELCOME_BACK_LEAD}</p>
                ) : null}
                {sessionId ? (
                  <button
                    type="button"
                    className="trial-landing-cta sub-flow-submit"
                    onClick={() => void retrySync()}
                  >
                    反映を再試行する
                  </button>
                ) : null}
                <Link href="/trial_4w" className="trial-landing-cta sub-flow-submit">
                  気づきノートへ
                </Link>
              </>
            )}
            {status === 'sync_error' && (
              <>
                <p className="sub-flow-lead" role="alert">
                  申し込みの反映に失敗しました。
                  {syncError ? `（${syncError}）` : ''}
                  時間をおいて再試行するか、サポートへご連絡ください。
                </p>
                {sessionId ? (
                  <button
                    type="button"
                    className="trial-landing-cta sub-flow-submit"
                    onClick={() => void retrySync()}
                  >
                    反映を再試行する
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <ProtoFooter />
    </div>
  );
}

export default function ApplyCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>
          読み込み中...
        </div>
      }
    >
      <ApplyCompleteInner />
    </Suspense>
  );
}
