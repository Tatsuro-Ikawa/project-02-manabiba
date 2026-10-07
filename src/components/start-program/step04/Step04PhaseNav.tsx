'use client';

import { STEP04_PHASES, type Step04Phase } from '@/lib/startProgram/step04Constants';

type Step04PhaseNavProps = {
  phase: Step04Phase;
  onChange: (phase: Step04Phase) => void;
  unlocked: Record<Step04Phase, boolean>;
  done: Record<Step04Phase, boolean>;
};

const LOCK_HINT: Partial<Record<Step04Phase, string>> = {
  changeability: 'テーマ領域を選び、理由を下限数まで挙げてから進んでください',
  layers: '全ての課題に回答し、①②が1件以上必要です',
  deepdive: '①②の各課題で1つ以上を選び、どれかの課題で「あり方」を選んでください',
};

export default function Step04PhaseNav({ phase, onChange, unlocked, done }: Step04PhaseNavProps) {
  return (
    <nav className="step02-phase-nav step04-phase-nav" aria-label="Step4のプロセス">
      <ol className="step02-phase-nav-list">
        {STEP04_PHASES.map((p) => {
          const isActive = phase === p.id;
          const locked = !unlocked[p.id];
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`step02-phase-nav-btn${isActive ? ' is-active' : ''}${
                  locked ? ' is-locked' : ''
                }`}
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
