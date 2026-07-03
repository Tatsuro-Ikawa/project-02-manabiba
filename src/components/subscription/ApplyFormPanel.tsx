'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DEMO_MERCHANT, DEMO_PLAN_PRICING, type ApplyPlan } from '@/lib/demoMerchantInfo';
import {
  APPLY_WELCOME_BACK_LEAD,
  isReturningPaidSubscriber,
} from '@/lib/subscription/courseReturn';
import { shouldSkipDemoApplyForm } from '@/lib/enrollmentCourse';
import { applyDemoPlanEnrollment } from '@/lib/firestore';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';

function parsePlan(raw: string | null): ApplyPlan | null {
  if (raw === 'standard' || raw === 'premium') return raw;
  return null;
}

export function ApplyFormPanel() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = useMemo(() => parsePlan(searchParams.get('plan')), [searchParams]);
  const pricing = plan ? DEMO_PLAN_PRICING[plan] : null;

  const [name, setName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTokushoho, setAgreeTokushoho] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingPrefilled, setBillingPrefilled] = useState(false);

  const isReturning = isReturningPaidSubscriber(userProfile);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!shouldRedirectUnauthenticatedToLogin()) return;
      const next = plan ? `/apply?plan=${plan}` : '/apply';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!plan) {
      router.replace('/trial_4w/landing');
    }
  }, [loading, user, plan, router]);

  const profilePending = !!user && !userProfile;
  const skipApply =
    !loading && !!userProfile && !!plan && shouldSkipDemoApplyForm(userProfile, plan);

  useEffect(() => {
    if (loading || !userProfile || !plan) return;
    if (shouldSkipDemoApplyForm(userProfile, plan)) {
      router.replace('/trial_4w');
    }
  }, [loading, userProfile, plan, router]);

  useEffect(() => {
    if (!userProfile || billingPrefilled) return;
    const billing = userProfile.applyBilling;
    if (billing?.fullName) {
      setName(billing.fullName);
      setPostalCode(billing.postalCode);
      setAddress(billing.address);
      setPhone(billing.phone);
      setBillingPrefilled(true);
      return;
    }
    if (user?.displayName) {
      setName(user.displayName);
      setBillingPrefilled(true);
    }
  }, [userProfile, user, billingPrefilled]);

  if (loading || !plan || !pricing || profilePending || skipApply) {
    return (
      <div className="sub-flow-panel">
        <p>読み込み中...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTokushoho || !user || !plan) return;
    setError(null);
    setSubmitting(true);
    try {
      const billing = {
        fullName: name.trim(),
        postalCode: postalCode.trim(),
        address: address.trim(),
        phone: phone.trim(),
      };
      await applyDemoPlanEnrollment(user.uid, plan, billing);
      await refreshUserProfile();
      const welcomeQs = isReturning ? '?welcomeBack=1' : '';
      router.replace(`/trial_4w${welcomeQs}`);
    } catch (err) {
      console.error('demo apply enrollment error:', err);
      setError('お申し込みの保存に失敗しました。しばらくしてから再試行してください。');
      setSubmitting(false);
    }
  };

  return (
    <div className="sub-flow-panel">
      <h2 className="sub-flow-title">{pricing.label}</h2>
      <p className="sub-flow-lead">
        以下の内容をご確認のうえ、お申し込みください。
        <span className="sub-flow-demo-badge">デモ</span>
      </p>

      {isReturning ? (
        <p className="sub-flow-welcome-back" role="status">
          {APPLY_WELCOME_BACK_LEAD}
        </p>
      ) : null}

      <section className="sub-flow-merchant" aria-label="事業者情報">
        <h3 className="sub-flow-section-title">販売事業者情報</h3>
        <dl className="sub-flow-dl">
          <div>
            <dt>販売事業者名</dt>
            <dd>{DEMO_MERCHANT.businessName}</dd>
          </div>
          <div>
            <dt>代表者</dt>
            <dd>{DEMO_MERCHANT.representative}</dd>
          </div>
          <div>
            <dt>所在地</dt>
            <dd>{DEMO_MERCHANT.address}</dd>
          </div>
          <div>
            <dt>電話番号</dt>
            <dd>
              {DEMO_MERCHANT.phone}
              <br />
              <span className="sub-flow-note-inline">（{DEMO_MERCHANT.phoneHours}）</span>
            </dd>
          </div>
          <div>
            <dt>メール</dt>
            <dd>
              <a href={`mailto:${DEMO_MERCHANT.email}`}>{DEMO_MERCHANT.email}</a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="sub-flow-merchant" aria-label="料金">
        <h3 className="sub-flow-section-title">お申し込み内容</h3>
        <ul className="sub-flow-price-list">
          <li>
            月額（税込）：<strong>{pricing.openPriceMonthly.toLocaleString()}円</strong>
          </li>
          {'openPriceYearly' in pricing && pricing.openPriceYearly ? (
            <li>年払い（税込）：{pricing.openPriceYearly.toLocaleString()}円／年</li>
          ) : null}
          <li>{pricing.openPriceNote}</li>
          {isReturning ? (
            <li>28日間無料お試し：再付与はありません（初回申込時のみ）</li>
          ) : (
            <li>{pricing.trialDays}日間無料お試し（初回申込時のみ）</li>
          )}
          {'sessionNote' in pricing && pricing.sessionNote ? <li>{pricing.sessionNote}</li> : null}
        </ul>
        <p className="sub-flow-note">
          詳細は
          <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          をご確認ください。
        </p>
      </section>

      <form className="sub-flow-form" onSubmit={handleSubmit}>
        <h3 className="sub-flow-section-title">お客様情報</h3>
        {isReturning && userProfile?.applyBilling ? (
          <p className="sub-flow-note">
            前回お申し込み時の情報を表示しています。変更がない場合はそのまま送信できます。
          </p>
        ) : null}
        <label className="sub-flow-field">
          <span>お名前</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="sub-flow-field">
          <span>メールアドレス</span>
          <input type="email" value={userProfile?.email ?? user?.email ?? ''} readOnly />
        </label>
        <label className="sub-flow-field">
          <span>郵便番号</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="例）504-0000"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </label>
        <label className="sub-flow-field">
          <span>住所</span>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
        <label className="sub-flow-field">
          <span>電話番号</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>

        <label className="sub-flow-checkbox">
          <input
            type="checkbox"
            checked={agreeTokushoho}
            onChange={(e) => setAgreeTokushoho(e.target.checked)}
          />
          <span>
            <Link href="/legal/tokushoho" target="_blank" rel="noopener noreferrer">
              特定商取引法に基づく表記
            </Link>
            および料金・解約条件を確認しました
          </span>
        </label>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="trial-landing-cta sub-flow-submit"
          disabled={!agreeTokushoho || submitting}
        >
          {submitting ? '送信中...' : isReturning ? '再開する（デモ）' : '申し込む（デモ）'}
        </button>
        <p className="sub-flow-note">
          決済（Stripe）は未接続です。送信後、気づきノート画面へ移動します（課金は発生しません）。
        </p>
      </form>
    </div>
  );
}
