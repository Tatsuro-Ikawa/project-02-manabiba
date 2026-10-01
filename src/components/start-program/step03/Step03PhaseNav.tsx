'use client';

import { STEP03_PHASES, type Step03Phase } from '@/lib/startProgram/step03Constants';

type Step03PhaseNavProps = {
  phase: Step03Phase;
  onChange: (phase: Step03Phase) => void;
  scoreReady: boolean;
  radarReady: boolean;
  focusDone: boolean;
};

export default function Step03PhaseNav({
  phase,
  onChange,
  scoreReady,
  radarReady,
  focusDone,
}: Step03PhaseNavProps) {
  return (
    <nav className="step02-phase-nav step03-phase-nav" aria-label="Step3のプロセス">
      <ol className="step02-phase-nav-list">
        {STEP03_PHASES.map((p) => {
          const isActive = phase === p.id;
          const locked =
            (p.id === 'radar' && !scoreReady) || (p.id === 'focus' && !radarReady);
          const done =
            (p.id === 'score' && scoreReady) ||
            (p.id === 'radar' && scoreReady && phase !== 'score') ||
            (p.id === 'focus' && focusDone);
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
                  p.id === 'radar' && !scoreReady
                    ? '8領域すべてに満足度をつけてから進んでください'
                    : p.id === 'focus' && !radarReady
                      ? '先に満足度を完成させてください'
                      : undefined
                }
              >
                {p.label}
                {done ? <span className="step02-phase-nav-check">✓</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
