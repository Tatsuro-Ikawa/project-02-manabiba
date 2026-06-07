'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DEMO_MERCHANT, DEMO_PLAN_PRICING, type ApplyPlan } from '@/lib/demoMerchantInfo';

function parsePlan(raw: string | null): ApplyPlan | null {
  if (raw === 'standard' || raw === 'premium') return raw;
  return null;
}

export function ApplyFormPanel() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = useMemo(() => parsePlan(searchParams.get('plan')), [searchParams]);
  const pricing = plan ? DEMO_PLAN_PRICING[plan] : null;

  const [name, setName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTokushoho, setAgreeTokushoho] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = plan ? `/apply?plan=${plan}` : '/apply';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!plan) {
      router.replace('/trial_4w/landing');
    }
  }, [loading, user, plan, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.displayName ?? '');
  }, [user]);

  if (loading || !plan || !pricing) {
    return (
      <div className="sub-flow-panel">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="sub-flow-panel sub-flow-success">
        <h2 className="sub-flow-title">お申し込みを受け付けました（デモ）</h2>
        <p className="sub-flow-lead">
          Stripe 連携前のデモ画面です。実際の課金・契約更新は行われていません。
        </p>
        <p className="sub-flow-note">
          {pricing.trialDays}日間の無料お試し終了後、月額 {pricing.openPriceMonthly.toLocaleString()}
          円（税込）の課金が開始される予定です。
        </p>
        <Link href="/trial_4w" className="trial-landing-cta sub-flow-cta-link">
          気づきノートへ
        </Link>
        <Link href="/courses/change" className="sub-flow-text-link">
          コース変更画面へ
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTokushoho) return;
    setSubmitted(true);
  };

  return (
    <div className="sub-flow-panel">
      <h2 className="sub-flow-title">{pricing.label}</h2>
      <p className="sub-flow-lead">
        以下の内容をご確認のうえ、お申し込みください。
        <span className="sub-flow-demo-badge">デモ</span>
      </p>

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
          <li>{pricing.trialDays}日間無料お試し（初回申込時のみ）</li>
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

        <button type="submit" className="trial-landing-cta sub-flow-submit" disabled={!agreeTokushoho}>
          申し込む（デモ）
        </button>
        <p className="sub-flow-note">
          決済（Stripe）は未接続です。送信しても課金は発生しません。
        </p>
      </form>
    </div>
  );
}
