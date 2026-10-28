'use client';

import type { ReactNode } from 'react';
import type { AiSlot } from '@/lib/startProgram/step04DeepDiveConstants';
import {
  STEP05_NAV_PHASES,
  STEP05_REFRESH_MAX,
  TARGET_SCORES,
  type Step05Phase,
  type TargetScore,
} from '@/lib/startProgram/step05Constants';

const LOCK_HINT: Partial<Record<Step05Phase, string>> = {
  review: 'Step4 の「こころの深掘り」で、どれか1つの気づきを保存してください',
  layers: '目指す満足度を決めてください',
  summary: '持ち方の欄をすべて書いてください',
  fit: '3方向それぞれに1つ以上書き、目標の一文を決めてください',
  current: '自分らしさの3つの問いに答えてください',
  board: '目標の全項目に「今の自分」を書いてください',
  gap: '前半の「見える化」で「このなりたい自分で進む」を押してください',
  markers: '全項目に違いを書き、各方向で重点を1つ選んでください',
  period: '重点ごとにしるしを決め、今の値と目指す値を入れてください',
  risk: '開始日・達成時期と、3つの節目の姿を決めてください',
  timeline: '振れ幅の画面で「確認した」を押してください',
};

type Step05PhaseNavProps = {
  phase: Step05Phase;
  onChange: (phase: Step05Phase) => void;
  unlocked: Record<Step05Phase, boolean>;
  done: Record<Step05Phase, boolean>;
};

/** Step5 のプロセス。自分らしさ以降と詳細計画は次の開発まで出さない */
export function Step05PhaseNav({ phase, onChange, unlocked, done }: Step05PhaseNavProps) {
  return (
    <nav className="step02-phase-nav step04-phase-nav step05-phase-nav" aria-label="Step5のプロセス">
      <ol className="step02-phase-nav-list">
        {STEP05_NAV_PHASES.map((p) => {
          const isActive = phase === p.id;
          const locked = !unlocked[p.id];
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`step02-phase-nav-btn${isActive ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
                disabled={locked}
                aria-current={isActive ? 'step' : undefined}
                title={locked ? LOCK_HINT[p.id] : undefined}
                onClick={() => onChange(p.id)}
              >
                {p.label}
                {done[p.id] ? <span className="step02-phase-nav-check">✓</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** 0〜10 の目盛り。onSelect があるときは、現状より上のセルだけ選べる */
export function ScoreScale({
  current,
  target,
  onSelect,
}: {
  current: number | null;
  target: number;
  onSelect?: (score: TargetScore) => void;
}) {
  const targetActive = current == null || target > current;
  return (
    <div className="step05-scale" aria-label={`満足度 現在 ${current ?? '—'} → 目標 ${targetActive ? target : '未選択'}`}>
      <div className="step05-scale-cells" role={onSelect ? 'radiogroup' : undefined} aria-label={onSelect ? '目指す満足度' : undefined}>
        {TARGET_SCORES.map((n) => {
          const blocked = current != null && n <= current;
          const isNow = current != null && n === current;
          const isTarget = targetActive && n === target;
          const between = targetActive && current != null && n > current && n < target;
          const cls = `${blocked ? ' is-blocked' : ''}${isNow ? ' is-now' : ''}${isTarget ? ' is-target' : ''}${between ? ' is-between' : ''}`;
          if (!onSelect) {
            return (
              <span key={n} className={`step05-scale-cell${cls}`}>
                {n}
              </span>
            );
          }
          return (
            <button
              key={n}
              type="button"
              className={`step05-scale-cell${cls}`}
              disabled={blocked}
              aria-pressed={isTarget}
              onClick={() => onSelect(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="step05-scale-marks" aria-hidden>
        {TARGET_SCORES.map((n) => {
          if (current != null && n === current) {
            return (
              <span key={n} className="step05-scale-mark is-now">
                ▲<small>現在 {n}</small>
              </span>
            );
          }
          if (targetActive && n === target) {
            return (
              <span key={n} className="step05-scale-mark is-target">
                ▼<small>目標 {n}</small>
              </span>
            );
          }
          return <span key={n} className="step05-scale-mark" />;
        })}
      </div>
    </div>
  );
}

type AiSuggestionsProps<T> = {
  slot: AiSlot<T>;
  /** 前段が変わり、候補が今の入力に合っていない */
  stale?: boolean;
  label: string;
  onRetry: () => void;
  onRefresh: () => void;
  onDismissNotice?: () => void;
  children: ReactNode;
};

/** AI 候補の枠（準備中・失敗・更新のお知らせ・Ai更新ボタン） */
export function AiSuggestions<T>({
  slot,
  stale,
  label,
  onRetry,
  onRefresh,
  onDismissNotice,
  children,
}: AiSuggestionsProps<T>) {
  const loading = slot.status === 'loading';
  const left = STEP05_REFRESH_MAX - slot.refreshCount;
  return (
    <div className="step05-ai" aria-busy={loading}>
      <div className="step05-ai-head">
        <span className="step05-ai-label">{label}</span>
        {slot.data ? (
          <button
            type="button"
            className="step04-dd-link"
            disabled={loading || left <= 0}
            title={left <= 0 ? 'Ai更新は3回までです' : undefined}
            onClick={onRefresh}
          >
            Ai更新（残り {Math.max(0, left)} 回）
          </button>
        ) : null}
      </div>
      {slot.refreshedNotice && !loading ? (
        <p className="step04-dd-notice" role="status">
          前の内容が変わったため、候補を更新しました。
          {onDismissNotice ? (
            <button type="button" className="step04-dd-link" onClick={onDismissNotice}>
              閉じる
            </button>
          ) : null}
        </p>
      ) : null}
      {stale && !loading && slot.data ? (
        <p className="step04-dd-notice" role="status">
          内容が変わりました。
          <button type="button" className="step04-dd-link" onClick={onRetry}>
            候補を作り直す
          </button>
        </p>
      ) : null}
      {slot.status === 'error' ? (
        <p className="step04-dd-notice is-error" role="alert">
          候補を準備できませんでした。
          <button type="button" className="step04-dd-link" onClick={onRetry}>
            もう一度
          </button>
        </p>
      ) : null}
      {loading && !slot.data ? (
        <div className="step04-dd-skeleton">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="step04-dd-skeleton-pill" />
          ))}
        </div>
      ) : (
        <div className={loading ? 'step05-ai-body is-loading' : 'step05-ai-body'}>{children}</div>
      )}
    </div>
  );
}

export function SelfList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="step05-ref-empty">{empty}</p>;
  return (
    <ul className="step05-ref-list">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
