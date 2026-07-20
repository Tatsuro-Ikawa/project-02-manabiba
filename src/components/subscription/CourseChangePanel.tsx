'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, UserProfile } from '@/types/auth';
import { useAuth } from '@/hooks/useAuth';
import { DEMO_PLAN_PRICING } from '@/lib/demoMerchantInfo';
import {
  COURSE_FEATURE_SECTIONS,
  COURSE_LIST_PRICING,
  COURSE_PLAN_LABELS,
  DATA_RETENTION_MSG,
  OPEN_PERIOD_PRICE_NOTE,
  buildFreeDowngradeConfirmMessage,
  buildPremiumUpgradeConfirmMessage,
  buildStandardDowngradeConfirmMessage,
  featureMarkToDisplay,
  type CoursePlanKey,
} from '@/lib/courseSelectionCatalog';
import { isDemoSubscriptionPathEnabled } from '@/lib/subscription/demoSubscriptionPath';
import { openStripeCustomerPortal } from '@/lib/client/openStripeCustomerPortal';
import { changeStripePlan } from '@/lib/client/changeStripePlan';
import { isOpenPricingPeriodActive } from '@/lib/stripe/openPricing';

function planToCourseKey(plan: SubscriptionPlan): CoursePlanKey {
  if (plan === 'standard' || plan === 'premium') return plan;
  return 'free';
}

function isTrialActive(profile: UserProfile | null): boolean {
  const end = profile?.subscription?.trialEndsAt;
  if (!end) return false;
  const ms = end instanceof Date ? end.getTime() : Number(end);
  return ms > Date.now();
}

function StandardPricingBox() {
  const open = DEMO_PLAN_PRICING.standard;
  const list = COURSE_LIST_PRICING.standard;
  return (
    <div className="trial-landing-price-box">
      <div className="trial-landing-price strike">¥{list.listMonthly.toLocaleString()}/月</div>
      <div className="trial-landing-price strike">¥{list.listYearlyPerMonth.toLocaleString()}/月*</div>
      <div className="trial-landing-note small strike">* 年払い　{list.listYearly.toLocaleString()}/年</div>
      <div className="trial-landing-price">¥{open.openPriceMonthly.toLocaleString()}/月</div>
      <div className="trial-landing-price">
        ¥{Math.round(open.openPriceYearly / 12).toLocaleString()}/月*
      </div>
      <div className="trial-landing-note small">年払い　{open.openPriceYearly.toLocaleString()}/年</div>
      <div className="trial-landing-note small">{OPEN_PERIOD_PRICE_NOTE}</div>
      <div className="trial-landing-badge">28日間フリー</div>
    </div>
  );
}

function PremiumPricingBox() {
  const open = DEMO_PLAN_PRICING.premium;
  const list = COURSE_LIST_PRICING.premium;
  return (
    <div className="trial-landing-price-box">
      <div className="trial-landing-price strike">¥{list.listMonthly.toLocaleString()}/月</div>
      <div className="trial-landing-price">¥{open.openPriceMonthly.toLocaleString()}/月</div>
      <div className="trial-landing-note small">{OPEN_PERIOD_PRICE_NOTE}</div>
      <div className="trial-landing-badge">60分セッション/月*</div>
      <div className="trial-landing-note small">* 追加対応　6,600円/60分</div>
    </div>
  );
}

function CoursePlanCta({
  plan,
  current,
  trialActive,
  busy,
  onSelect,
}: {
  plan: CoursePlanKey;
  current: CoursePlanKey;
  trialActive: boolean;
  busy: boolean;
  onSelect: (plan: CoursePlanKey) => void;
}) {
  if (plan === current) {
    const trialLabel = trialActive && plan !== 'free' ? '（お試し付き）' : '';
    return (
      <span className="trial-landing-cta trial-landing-cta--in-use" aria-current="true">
        選択中{trialLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="trial-landing-cta sub-flow-cta-btn"
      onClick={() => onSelect(plan)}
      disabled={busy}
    >
      {busy ? '処理中...' : '選択する'}
    </button>
  );
}

interface CourseChangePanelProps {
  userProfile: UserProfile | null;
}

export function CourseChangePanel({ userProfile }: CourseChangePanelProps) {
  const router = useRouter();
  const { user, refreshUserProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const currentPlan = userProfile?.subscription?.plan ?? 'free';
  const current = planToCourseKey(currentPlan);
  const trialActive = isTrialActive(userProfile);
  const hasStripeBilling = !!userProfile?.subscription?.stripeCustomerId?.trim();

  const goToStripePortal = async (confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    if (!user) {
      alert('ログイン情報を取得できませんでした。');
      return;
    }
    setBusy(true);
    try {
      await openStripeCustomerPortal(user, '/courses/change');
    } catch (e) {
      console.error('Customer Portal error:', e);
      alert(
        e instanceof Error
          ? e.message
          : 'プラン管理ページを開けませんでした。時間をおいて再度お試しください。'
      );
      setBusy(false);
    }
  };

  const changePaidPlan = async (target: 'standard' | 'premium', confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    if (!user) {
      alert('ログイン情報を取得できませんでした。');
      return;
    }
    setBusy(true);
    try {
      const result = await changeStripePlan(user, target);
      await refreshUserProfile();
      if (result.mode === 'downgrade_at_period_end' && result.effectiveAt) {
        const when = new Date(result.effectiveAt).toLocaleString('ja-JP');
        alert(
          `スタンダードコースへの変更を予約しました。切替予定: ${when}\n反映まで数十秒かかることがあります。`
        );
      } else {
        alert('プレミアムコースへ変更しました。反映まで数十秒かかることがあります。');
      }
    } catch (e) {
      console.error('change-plan error:', e);
      alert(e instanceof Error ? e.message : 'コース変更に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = async (target: CoursePlanKey) => {
    if (target === current || busy) return;
    const openPricing = isOpenPricingPeriodActive();

    if (target === 'premium') {
      if (hasStripeBilling && current === 'standard') {
        await changePaidPlan('premium', buildPremiumUpgradeConfirmMessage(openPricing));
        return;
      }
      router.push('/apply?plan=premium');
      return;
    }

    if (target === 'standard' && current === 'free') {
      router.push('/apply?plan=standard');
      return;
    }

    if (target === 'free' && current !== 'free') {
      if (hasStripeBilling) {
        await goToStripePortal(buildFreeDowngradeConfirmMessage(trialActive));
        return;
      }
      if (!isDemoSubscriptionPathEnabled()) {
        alert(
          'フリーコースへの変更・解約は、有料プランお申し込み後に Customer Portal からお手続きください。'
        );
        return;
      }
      if (!window.confirm(buildFreeDowngradeConfirmMessage(trialActive))) return;
      if (!user?.uid) {
        alert('ログイン情報を取得できませんでした。');
        return;
      }
      setBusy(true);
      try {
        const { applyDemoDowngradeToFree } = await import('@/lib/firestore');
        await applyDemoDowngradeToFree(user.uid);
        await refreshUserProfile();
        const qs = trialActive ? '?downgraded=free&hadTrial=1' : '?downgraded=free';
        router.push(`/start-program${qs}`);
      } catch (e) {
        console.error('フリーコースへのダウングレードエラー:', e);
        alert('コース変更に失敗しました。時間をおいて再度お試しください。');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (target === 'standard' && current === 'premium') {
      if (hasStripeBilling) {
        await changePaidPlan('standard', buildStandardDowngradeConfirmMessage(openPricing));
        return;
      }
      if (!isDemoSubscriptionPathEnabled()) {
        alert(
          'プランのダウングレードは、有料プランお申し込み後にコース変更画面からお手続きください。'
        );
        return;
      }
      if (!window.confirm(buildStandardDowngradeConfirmMessage(openPricing))) return;
      if (!user?.uid) {
        alert('ログイン情報を取得できませんでした。');
        return;
      }
      setBusy(true);
      try {
        const { applyDemoDowngradeToStandard } = await import('@/lib/firestore');
        await applyDemoDowngradeToStandard(user.uid);
        await refreshUserProfile();
        router.push('/trial_4w?downgraded=standard');
      } catch (e) {
        console.error('スタンダードコースへのダウングレードエラー:', e);
        alert('コース変更に失敗しました。時間をおいて再度お試しください。');
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div className="course-change-panel">
      <p className="course-change-lead">
        現在のプラン：<strong>{COURSE_PLAN_LABELS[current]}</strong>
        {trialActive && current !== 'free' ? '（28日お試し期間中）' : null}
      </p>
      <p className="sub-flow-note">{DATA_RETENTION_MSG}</p>

      {hasStripeBilling ? (
        <div className="sub-flow-note">
          <p>
            スタンダード⇔プレミアムの変更は、下のコースを選択するとこの画面から手続きできます（オープン期間中は期間限定価格）。
          </p>
          <p>
            解約（フリー）・お支払い方法の更新は次の画面（
            <button
              type="button"
              className="sub-flow-text-link"
              disabled={busy}
              onClick={() => void goToStripePortal()}
            >
              Customer Portal
            </button>
            ）から行えます。フリーにする場合は「サブスクリプションをキャンセル」を選んでください。
          </p>
          <p>手続き後、反映まで数十秒かかることがあります。</p>
        </div>
      ) : null}

      <div className="course-change-cols" role="group" aria-label="サブスクリプションコース">
        <section className="course-change-col" aria-label="フリーコース">
          <div className="trial-landing-col-header">{COURSE_PLAN_LABELS.free}</div>
          <div className="trial-landing-price-box">
            <div className="trial-landing-price">¥0</div>
          </div>
          <CoursePlanCta plan="free" current={current} trialActive={trialActive} busy={busy} onSelect={handleSelect} />
        </section>

        <section className="course-change-col" aria-label="スタンダードコース">
          <div className="trial-landing-col-header">{COURSE_PLAN_LABELS.standard}</div>
          <StandardPricingBox />
          <CoursePlanCta plan="standard" current={current} trialActive={trialActive} busy={busy} onSelect={handleSelect} />
        </section>

        <section className="course-change-col" aria-label="プレミアムコース">
          <div className="trial-landing-col-header">{COURSE_PLAN_LABELS.premium}</div>
          <PremiumPricingBox />
          <CoursePlanCta plan="premium" current={current} trialActive={trialActive} busy={busy} onSelect={handleSelect} />
        </section>
      </div>

      <div className="course-change-feature-wrap">
        <h2 className="course-change-feature-title">メインプログラムのサブスクリプションコースと機能・サービス一覧</h2>
        <div className="course-change-feature-scroll">
          <table className="course-change-feature-table">
            <thead>
              <tr>
                <th scope="col">機能・サービス一覧</th>
                <th scope="col">{COURSE_PLAN_LABELS.free}</th>
                <th scope="col">{COURSE_PLAN_LABELS.standard}</th>
                <th scope="col">{COURSE_PLAN_LABELS.premium}</th>
              </tr>
            </thead>
            <tbody>
              {COURSE_FEATURE_SECTIONS.map((section, si) => (
                <Fragment key={`section-${si}`}>
                  {section.heading ? (
                    <tr className="course-change-feature-section-row">
                      <th scope="rowgroup" colSpan={4}>
                        {section.heading}
                      </th>
                    </tr>
                  ) : null}
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className={row.indent ? 'course-change-feature-indent' : undefined}>
                        {row.label}
                      </th>
                      <td>{featureMarkToDisplay(row.free)}</td>
                      <td>{featureMarkToDisplay(row.standard)}</td>
                      <td>{featureMarkToDisplay(row.premium)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="course-change-footnote">* 気づきノートのマネジメント情報は除く。</p>
      </div>

      <p className="trial-landing-tokushoho-note">
        特定商取引法に基づく表記は
        <Link href="/legal/tokushoho">こちら</Link>
      </p>
    </div>
  );
}
