'use client';

import { useEffect, useId } from 'react';
import type { MandalaDomainDef, MandalaEntryLocal } from '@/lib/startProgram/mandalaConstants';
import {
  STEP03_SCORE_MAX,
  STEP03_SCORE_MIN,
  type DomainSatisfaction,
} from '@/lib/startProgram/step03Constants';

type Step03SatisfactionModalProps = {
  domain: MandalaDomainDef;
  step01Entries: MandalaEntryLocal[];
  satisfaction: DomainSatisfaction;
  onScoreChange: (score: number | null) => void;
  onClose: () => void;
};

const SCORE_OPTIONS = Array.from(
  { length: STEP03_SCORE_MAX - STEP03_SCORE_MIN + 1 },
  (_, i) => STEP03_SCORE_MIN + i
);

/** 領域ごとの満足度のみ（理由は Step4） */
export default function Step03SatisfactionModal({
  domain,
  step01Entries,
  satisfaction,
  onScoreChange,
  onClose,
}: Step03SatisfactionModalProps) {
  const titleId = useId();
  const wishLines = step01Entries.map((e) => e.text.trim()).filter(Boolean);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mandala-modal step03-sat-modal step03-sat-modal--score-only"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="mandala-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            {domain.label}
            <span className="step03-sat-modal-sub">の満足度</span>
          </h3>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>

        <section className="step03-sat-ref" aria-label="Step1の願望（参照）">
          <p className="step03-sat-section-label">理想の自分（Step1・参照）</p>
          {wishLines.length === 0 ? (
            <p className="step03-sat-ref-empty">
              Step1 未記入です。必要なら Step1 で願望を書いてから戻ってください。
            </p>
          ) : (
            <ul className="step03-sat-ref-list">
              {wishLines.map((text, i) => (
                <li key={`${domain.id}-ref-${i}`}>{text}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="step03-sat-score" aria-label="満足度">
          <p className="step03-sat-section-label">
            いまの満足度（0〜10）
            <span className="step03-sat-section-hint">
              10＝十分満足／0＝まったく満足していない
            </span>
          </p>
          <div className="step03-sat-chips" role="group" aria-label="満足度の点数">
            {SCORE_OPTIONS.map((n) => {
              const selected = satisfaction.score === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={`step03-sat-chip${selected ? ' is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onScoreChange(selected ? null : n)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>

        <div className="step03-sat-modal-done">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
