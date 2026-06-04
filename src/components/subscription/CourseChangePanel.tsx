'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@/types/auth';
import type { UserProfile } from '@/types/auth';

const DATA_RETENTION_MSG =
  'コースを変更すると、不要になったデータは90日間保存した後、削除されます。';

type CourseKey = 'free' | 'standard' | 'premium';

const COURSE_ROWS: { key: CourseKey; title: string; subtitle: string }[] = [
  { key: 'free', title: 'フリーコース', subtitle: '7日間スタートプログラム（セルフコーチング）' },
  { key: 'standard', title: 'スタンダードコース', subtitle: '気づきノート AIコーチ' },
  { key: 'premium', title: 'プレミアムコース', subtitle: '気づきノート プライベートコーチ' },
];

function planLabel(plan: SubscriptionPlan): string {
  if (plan === 'standard') return 'スタンダード';
  if (plan === 'premium') return 'プレミアム';
  return 'フリー';
}

function isTrialActive(profile: UserProfile | null): boolean {
  const end = profile?.subscription?.trialEndsAt;
  if (!end) return false;
  const ms = end instanceof Date ? end.getTime() : Number(end);
  return ms > Date.now();
}

interface CourseChangePanelProps {
  userProfile: UserProfile | null;
}

export function CourseChangePanel({ userProfile }: CourseChangePanelProps) {
  const router = useRouter();
  const currentPlan = userProfile?.subscription?.plan ?? 'free';
  const trialActive = isTrialActive(userProfile);

  if (currentPlan === 'free') {
    return (
      <div className="sub-flow-panel">
        <p className="sub-flow-lead">
          フリー会員の方は、ホームの「試してみる」から
          <Link href="/trial_4w/landing">コース選択（ランディング）</Link>
          でプランをお選びください。
        </p>
      </div>
    );
  }

  const handleSelect = (target: CourseKey) => {
    if (target === currentPlan) return;

    if (target === 'premium') {
      router.push('/apply?plan=premium');
      return;
    }

    if (target === 'standard' && currentPlan === 'premium') {
      if (window.confirm(`${DATA_RETENTION_MSG}\n\nスタンダードコースへ変更しますか？（デモ）`)) {
        alert('コース変更を受け付けました（Stripe 連携前のデモです）。');
      }
      return;
    }

    if (target === 'free') {
      if (window.confirm(`${DATA_RETENTION_MSG}\n\nフリーコースへ変更しますか？（デモ）`)) {
        alert('コース変更を受け付けました（Stripe 連携前のデモです）。');
      }
      return;
    }

    if (target === 'standard' && currentPlan === 'free') {
      router.push('/apply?plan=standard');
    }
  };

  return (
    <div className="sub-flow-stack">
      <p className="sub-flow-lead">
        現在のプラン：<strong>{planLabel(currentPlan)}</strong>
        {trialActive ? '（28日お試し期間中）' : null}
      </p>
      <p className="sub-flow-note">{DATA_RETENTION_MSG}</p>

      {COURSE_ROWS.map((row) => {
        if (row.key === 'free' && currentPlan === 'free') return null;

        const isCurrent = row.key === currentPlan;
        const isSelectable =
          !isCurrent &&
          !(currentPlan === 'free' && row.key === 'free') &&
          currentPlan !== 'free';

        let cta: React.ReactNode;
        if (isCurrent) {
          cta = (
            <span className="trial-landing-cta trial-landing-cta--in-use">
              選択中{trialActive && row.key !== 'free' ? '（お試し付き）' : ''}
            </span>
          );
        } else if (!isSelectable && currentPlan === 'free') {
          cta = <span className="sub-flow-muted">—</span>;
        } else if (isSelectable) {
          cta = (
            <button
              type="button"
              className="trial-landing-cta sub-flow-cta-btn"
              onClick={() => handleSelect(row.key)}
            >
              選択
            </button>
          );
        } else {
          cta = <span className="sub-flow-muted">—</span>;
        }

        return (
          <section key={row.key} className="trial-landing-card sub-flow-card" aria-label={row.title}>
            <div className="trial-landing-card-inner">
              <div className="trial-landing-col-header">{row.title}</div>
              <p className="sub-flow-course-sub">{row.subtitle}</p>
              {row.key !== 'free' && row.key === currentPlan && trialActive ? (
                <div className="trial-landing-badge">28日間フリー</div>
              ) : null}
              {cta}
            </div>
          </section>
        );
      })}

      <p className="sub-flow-note">
        プレミアムへのアップグレードは
        <Link href="/apply?plan=premium">申込フォーム</Link>
        へ進みます（同意済みの場合は再同意不要）。
      </p>
    </div>
  );
}
