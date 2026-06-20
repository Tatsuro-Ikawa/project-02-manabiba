'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import { useAuth } from '@/hooks/useAuth';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { hasAcceptedCurrentConsents } from '@/lib/consent';
import {
  hasAiCoachOrPremiumSignup,
  isStart7dOnly,
  PREMIUM_APPLY_PATH,
  STANDARD_APPLY_PATH,
} from '@/lib/enrollmentCourse';
import { isLandingBackRequiresSignOut } from '@/lib/onboardingFlow';
import { signOutAndRedirect } from '@/lib/intentionalSignOut';

const freeSignupDest = '/start-program';
const premiumApplyLoginNext = `/login?next=${encodeURIComponent(PREMIUM_APPLY_PATH)}`;
const standardApplyLoginNext = `/login?next=${encodeURIComponent(STANDARD_APPLY_PATH)}`;

function Trial4wLandingContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backingOut, setBackingOut] = useState(false);
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const { bundle, loading: legalLoading } = useLegalDocuments();
  const searchParams = useSearchParams();
  const loggedIn = !loading && !!user;
  const profileReady = !loading && (!user || !!userProfile);
  const start7dOnly = loggedIn && isStart7dOnly(userProfile);
  const kizukiSignedUp = loggedIn && hasAiCoachOrPremiumSignup(userProfile);
  const isPremiumPlan = userProfile?.subscription?.plan === 'premium';
  const needsConsentBanner = searchParams.get('needsConsent') === '1';
  const backRequiresSignOut = isLandingBackRequiresSignOut(needsConsentBanner, loggedIn);

  const consentAccepted = useMemo(() => {
    if (!userProfile || !bundle) return false;
    return hasAcceptedCurrentConsents(userProfile, bundle.terms.version, bundle.privacy.version);
  }, [userProfile, bundle]);

  const consentNext7d = '/consent?next=' + encodeURIComponent('/start-program');
  const consentNextStandard = '/consent?next=' + encodeURIComponent(STANDARD_APPLY_PATH);
  const consentNextPremium = '/consent?next=' + encodeURIComponent(PREMIUM_APPLY_PATH);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleBack = async () => {
    if (backRequiresSignOut) {
      setBackingOut(true);
      try {
        await signOutAndRedirect(signOut, router, '/');
      } catch (e) {
        console.error('landing back signOut error:', e);
        setBackingOut(false);
      }
      return;
    }
    router.replace('/');
  };

  const premiumApplyHref = loggedIn ? PREMIUM_APPLY_PATH : premiumApplyLoginNext;
  const standardApplyHref = loggedIn ? STANDARD_APPLY_PATH : standardApplyLoginNext;

  const render7DayCta = () => {
    if (start7dOnly) {
      return (
        <Link href="/start-program" className="trial-landing-cta trial-landing-cta--in-use">
          利用中
        </Link>
      );
    }
    if (loggedIn && profileReady) {
      if (!consentAccepted) {
        return (
          <Link href={consentNext7d} className="trial-landing-cta">
            やってみる
          </Link>
        );
      }
      return (
        <Link href={freeSignupDest} className="trial-landing-cta">
          やってみる
        </Link>
      );
    }
    if (loggedIn) {
      return <span className="trial-landing-cta trial-landing-cta--in-use" aria-disabled="true">読み込み中...</span>;
    }
    return (
      <Link href={`/login?next=${encodeURIComponent(freeSignupDest)}`} className="trial-landing-cta">
        やってみる
      </Link>
    );
  };

  const renderAiCoachCta = () => {
    if (loggedIn && profileReady && !consentAccepted) {
      return (
        <Link href={consentNextStandard} className="trial-landing-cta">
          やってみる
        </Link>
      );
    }
    if (start7dOnly) {
      return (
        <Link href={standardApplyHref} className="trial-landing-cta">
          申し込む
        </Link>
      );
    }
    if (kizukiSignedUp) {
      return (
        <Link href="/trial_4w" className="trial-landing-cta trial-landing-cta--in-use">
          利用中
        </Link>
      );
    }
    if (loggedIn && profileReady) {
      return (
        <Link href={STANDARD_APPLY_PATH} className="trial-landing-cta">
          やってみる
        </Link>
      );
    }
    if (loggedIn) {
      return <span className="trial-landing-cta trial-landing-cta--in-use" aria-disabled="true">読み込み中...</span>;
    }
    return (
      <Link href={standardApplyLoginNext} className="trial-landing-cta">
        やってみる
      </Link>
    );
  };

  const renderPremiumCta = () => {
    if (isPremiumPlan) {
      return (
        <span className="trial-landing-cta trial-landing-cta--in-use" aria-disabled="true">
          利用中
        </span>
      );
    }
    if (loggedIn && profileReady && !consentAccepted) {
      return (
        <Link href={consentNextPremium} className="trial-landing-cta">
          申し込む
        </Link>
      );
    }
    return (
      <Link href={premiumApplyHref} className="trial-landing-cta">
        申し込む
      </Link>
    );
  };

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar variant="trial" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <div className="trial-landing-top">
            {backRequiresSignOut ? (
              <button
                type="button"
                className="trial-landing-back"
                aria-label="ホームへ戻る"
                onClick={handleBack}
                disabled={backingOut}
              >
                {backingOut ? 'ログアウト中...' : '戻る'}
              </button>
            ) : (
              <Link href="/" className="trial-landing-back" aria-label="ホームへ戻る">
                戻る
              </Link>
            )}
          </div>

          <h2 className="trial-landing-headline">一度きりの人生、なりたい自分を目指しませんか？</h2>

          {needsConsentBanner && loggedIn && profileReady && !consentAccepted && !legalLoading ? (
            <p className="trial-landing-premium-notice" role="status">
              ログインが完了しました。続けるには、下のコースから選び、会員同意のあとにご利用を開始してください。
            </p>
          ) : null}

          <div className="trial-landing-stack">
            <section className="trial-landing-card" aria-label="7日間プログラム">
              <div className="trial-landing-subtitle">◆ なりたい自分への近道</div>
              <div className="trial-landing-card-inner">
                <div className="trial-landing-card-title">自分を変える7日間プログラム</div>
                <div className="trial-landing-cols trial-landing-cols--single">
                  <div className="trial-landing-col">
                    <div className="trial-landing-col-header">セルフコーチング（フリーコース）</div>
                    <div className="trial-landing-price-box">
                      <div className="trial-landing-price">¥0</div>
                    </div>
                    {render7DayCta()}
                  </div>
                </div>
              </div>
            </section>
            <section className="trial-landing-card" aria-label="ページ 2/2">
              <div className="trial-landing-subtitle">◆ 習慣化へのはじめの一歩</div>
              <div className="trial-landing-card-inner">
                <div className="trial-landing-card-title">気づきと学びのマネジメント日誌「気づきノート」</div>
                <div className="trial-landing-cols">
                  <div className="trial-landing-col">
                    <div className="trial-landing-col-header">AIコーチ</div>
                    <div className="trial-landing-price-box">
                      <div className="trial-landing-price strike">¥1,650/月</div>
                      <div className="trial-landing-price strike">¥1,320/月*</div>
                      <div className="trial-landing-note small strike">* 年払い　15,840/年</div>
                      <div className="trial-landing-price">¥1,320/月</div>
                      <div className="trial-landing-price">¥980/月*</div>
                      <div className="trial-landing-note small">年払い　11,760/年</div>
                      <div className="trial-landing-note small">(オープン期間(2026年末)限定価格)</div>
                      <div className="trial-landing-badge">28日間フリー</div>
                    </div>
                    {renderAiCoachCta()}
                  </div>
                  <div className="trial-landing-col">
                    <div className="trial-landing-col-header">プライベートコーチ</div>
                    <div className="trial-landing-price-box">
                      <div className="trial-landing-price strike">¥6,600/月</div>
                      <div className="trial-landing-price">¥3,300/月</div>
                      <div className="trial-landing-note small">(オープン期間(2026年末)限定価格)</div>
                      <div className="trial-landing-badge">60分セッション/月*</div>
                      <div className="trial-landing-note small">* 追加対応　6,600円/60分</div>
                    </div>
                    {renderPremiumCta()}
                  </div>
                </div>
                <p className="trial-landing-tokushoho-note">
                  特定商取引法に基づく表記は
                  <Link href="/legal/tokushoho">こちら</Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ProtoFooter />
    </div>
  );
}

export default function Trial4wLandingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ fontFamily: 'var(--font-family-jp)' }}
        >
          読み込み中...
        </div>
      }
    >
      <Trial4wLandingContent />
    </Suspense>
  );
}

