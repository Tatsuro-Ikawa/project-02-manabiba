'use client';

import { useEffect, useRef } from 'react';
import {
  SEVEN_STEPS,
  clampStepIndex,
  getSevenStepsStep,
  stepUrl,
  type StepPane,
} from '@/lib/startProgram/sevenStepsConstants';

type StepNavigatorProps = {
  stepIndex: number;
  onNavigate: (url: string) => void;
};

/** Step 間ナビ（Step ピル + 左右矢印 + 現在タイトル） */
export default function StepNavigator({ stepIndex, onNavigate }: StepNavigatorProps) {
  const safeIndex = clampStepIndex(stepIndex);
  const step = getSevenStepsStep(safeIndex);
  const pillStripRef = useRef<HTMLDivElement>(null);
  const total = SEVEN_STEPS.length;
  const atFirst = safeIndex <= 0;
  const atLast = safeIndex >= total - 1;

  useEffect(() => {
    const strip = pillStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLButtonElement>(`[data-step-index="${safeIndex}"]`);
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [safeIndex]);

  const goStep = (nextIndex: number, pane: StepPane = 'guide') => {
    const next = getSevenStepsStep(nextIndex);
    if (!next) return;
    const p = next.panes.includes(pane) ? pane : next.panes[0];
    onNavigate(stepUrl(nextIndex, p));
  };

  return (
    <nav className="seven-steps-step-nav" aria-label="ステップ全体ナビ">
      <div className="seven-steps-step-nav-row">
        <button
          type="button"
          className="seven-steps-nav-arrow"
          disabled={atFirst}
          aria-label="前のステップ"
          onClick={() => goStep(safeIndex - 1)}
        >
          <span className="material-symbols-outlined" aria-hidden>
            chevron_left
          </span>
        </button>

        <div
          className="seven-steps-pills"
          ref={pillStripRef}
          role="tablist"
          aria-label="ステップ一覧（タップで移動・横にスクロールできます）"
        >
          {SEVEN_STEPS.map((s) => (
            <button
              key={s.index}
              type="button"
              role="tab"
              data-step-index={s.index}
              className={`seven-steps-pill ${s.index === safeIndex ? 'is-active' : ''}`}
              aria-label={`Step${s.index}: ${s.title}`}
              aria-selected={s.index === safeIndex}
              onClick={() => goStep(s.index)}
            >
              Step{s.index}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="seven-steps-nav-arrow"
          disabled={atLast}
          aria-label="次のステップ"
          onClick={() => goStep(safeIndex + 1)}
        >
          <span className="material-symbols-outlined" aria-hidden>
            chevron_right
          </span>
        </button>
      </div>

      <p className="seven-steps-step-nav-current" aria-live="polite">
        <span className="seven-steps-step-nav-current-label">
          Step{safeIndex} / {total - 1}
        </span>
        <span className="seven-steps-step-nav-current-title">{step?.title}</span>
      </p>
    </nav>
  );
}
