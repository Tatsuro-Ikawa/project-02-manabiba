'use client';

import { VALUES_PHASES, type ValuesPhase } from '@/lib/startProgram/step02ValuesConstants';

type Props = {
  phase: ValuesPhase;
  onChange: (phase: ValuesPhase) => void;
  digDone: boolean;
  groupReady: boolean;
  groupNamed: boolean;
  sentenceReady: boolean;
  sentenceFilled: boolean;
};

export default function Step02ValuesPhaseNav({
  phase,
  onChange,
  digDone,
  groupReady,
  groupNamed,
  sentenceReady,
  sentenceFilled,
}: Props) {
  return (
    <nav className="step02-phase-nav" aria-label="価値観レーンのプロセス">
      <ol className="step02-phase-nav-list">
        {VALUES_PHASES.map((p) => {
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
