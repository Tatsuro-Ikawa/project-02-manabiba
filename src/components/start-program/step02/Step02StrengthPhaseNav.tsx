'use client';

import { STRENGTH_PHASES, type StrengthPhase } from '@/lib/startProgram/step02StrengthConstants';

type Props = {
  phase: StrengthPhase;
  onChange: (phase: StrengthPhase) => void;
  digDone: boolean;
  groupReady: boolean;
  groupNamed: boolean;
  sentenceReady: boolean;
  sentenceFilled: boolean;
};

export default function Step02StrengthPhaseNav({
  phase,
  onChange,
  digDone,
  groupReady,
  groupNamed,
  sentenceReady,
  sentenceFilled,
}: Props) {
  return (
    <nav className="step02-phase-nav" aria-label="得意・強みレーンのプロセス">
      <ol className="step02-phase-nav-list">
        {STRENGTH_PHASES.map((p) => {
          const isActive = phase === p.id;
          const locked =
            (p.id === 'group' && !groupReady) || (p.id === 'sentence' && !sentenceReady);
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`step02-phase-nav-btn${isActive ? ' is-active' : ''}${
                  locked ? ' is-locked' : ''
                }`}
                disabled={locked}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => {
                  if (!locked) onChange(p.id);
                }}
              >
                {p.label}
                {p.id === 'dig' && digDone ? (
                  <span className="step02-phase-nav-check">✓</span>
                ) : null}
                {p.id === 'group' && groupNamed ? (
                  <span className="step02-phase-nav-check">✓</span>
                ) : null}
                {p.id === 'sentence' && sentenceFilled ? (
                  <span className="step02-phase-nav-check">✓</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
