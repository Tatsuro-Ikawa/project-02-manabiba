'use client';

import { INTEREST_PHASES, type InterestPhase } from '@/lib/startProgram/step02Constants';

type Step02InterestPhaseNavProps = {
  phase: InterestPhase;
  onChange: (phase: InterestPhase) => void;
  digDone: boolean;
  groupReady: boolean;
  groupNamed: boolean;
  sentenceReady: boolean;
  sentenceFilled: boolean;
};

export default function Step02InterestPhaseNav({
  phase,
  onChange,
  digDone,
  groupReady,
  groupNamed,
  sentenceReady,
  sentenceFilled,
}: Step02InterestPhaseNavProps) {
  return (
    <nav className="step02-phase-nav" aria-label="興味レーンのプロセス">
      <ol className="step02-phase-nav-list">
        {INTEREST_PHASES.map((p) => {
          const isActive = phase === p.id;
          const locked =
            !p.available ||
            (p.id === 'group' && !groupReady) ||
            (p.id === 'sentence' && !sentenceReady);
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
                title={
                  p.id === 'group' && !groupReady
                    ? '掘り下げで興味を1つ以上選んでください'
                    : p.id === 'sentence' && !sentenceReady
                      ? 'まとめるで色分けしてから進んでください'
                      : undefined
                }
              >
                {p.label}
                {p.id === 'dig' && digDone ? (
                  <span className="step02-phase-nav-check" aria-label="完了">
                    ✓
                  </span>
                ) : null}
                {p.id === 'group' && groupNamed ? (
                  <span className="step02-phase-nav-check" aria-label="完了">
                    ✓
                  </span>
                ) : null}
                {p.id === 'sentence' && sentenceFilled ? (
                  <span className="step02-phase-nav-check" aria-label="完了">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
