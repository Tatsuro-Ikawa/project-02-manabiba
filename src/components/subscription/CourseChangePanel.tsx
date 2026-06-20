'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, UserProfile } from '@/types/auth';
import { DEMO_PLAN_PRICING } from '@/lib/demoMerchantInfo';
import {
  COURSE_FEATURE_SECTIONS,
  COURSE_LIST_PRICING,
  COURSE_PLAN_LABELS,
  DATA_RETENTION_MSG,
  OPEN_PERIOD_PRICE_NOTE,
  featureMarkToDisplay,
  type CoursePlanKey,
} from '@/lib/courseSelectionCatalog';

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
  onSelect,
}: {
  plan: CoursePlanKey;
  current: CoursePlanKey;
  trialActive: boolean;
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
    <button type="button" className="trial-landing-cta sub-flow-cta-btn" onClick={() => onSelect(plan)}>
      選択する
    </button>
  );
}

interface CourseChangePanelProps {
  userProfile: UserProfile | null;
}

export function CourseChangePanel({ userProfile }: CourseChangePanelProps) {
  const router = useRouter();
  const currentPlan = userProfile?.subscription?.plan ?? 'free';
  const current = planToCourseKey(currentPlan);
  const trialActive = isTrialActive(userProfile);

  const handleSelect = (target: CoursePlanKey) => {
    if (target === current) return;

    if (target === 'premium') {
      router.push('/apply?plan=premium');
      return;
    }

    if (target === 'standard' && (current === 'free' || current === 'premium')) {
      router.push('/apply?plan=standard');
      return;
    }

    if (target === 'free' && current !== 'free') {
      if (window.confirm(`${DATA_RETENTION_MSG}\n\nフリーコースへ変更しますか？（デモ）`)) {
        alert('コース変更を受け付けました（Stripe 連携前のデモです）。');
      }
      return;
    }

    if (target === 'standard' && current === 'premium') {
      if (window.confirm(`${DATA_RETENTION_MSG}\n\nスタンダードコースへ変更しますか？（デモ）`)) {
        alert('コース変更を受け付けました（Stripe 連携前のデモです）。');
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

      <div className="course-change-cols" role="group" aria-label="サブスクリプションコース">
        <section className="course-change-col" aria-label="フリーコース">
          <div className="trial-landing-col-header">{COURSE_PLAN_LABELS.free}</div>
          <div className="trial-landing-price-box">
            <div className="trial-landing-price">¥0</div>
          </div>
          <CoursePlanCta plan="free" current={current} trialActive={trialActive} onSelect={handleSelect} />
        </section>

        <section className="course-change-col" aria-label="スタンダードコース">
          <div className="trial-landing-col-header">{COURSE_PLAN_LABELS.standard}</div>
          <StandardPricingBox />
          <CoursePlanCta plan="standard" current={current} trialActive={trialActive} onSelect={handleSelect} />
        </section>

        <section className="course-change-col" aria-label="プレミアムコース">
          <div className="trial-landing-col-header">{COURSE_PLAN_LABELS.premium}</div>
          <PremiumPricingBox />
          <CoursePlanCta plan="premium" current={current} trialActive={trialActive} onSelect={handleSelect} />
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
