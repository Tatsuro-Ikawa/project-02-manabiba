'use client';

import { ScoreScale } from '@/components/start-program/step05/Step05Parts';
import {
  FIT_QUESTIONS,
  STEP05_LAYERS,
  filledItems,
  fitMark,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';

type Step05BoardPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  onConfirm: () => void;
  onSecondHalf: () => void;
};

export default function Step05BoardPhase({ ctx, theme, onConfirm, onSecondHalf }: Step05BoardPhaseProps) {
  const items = filledItems(theme);

  return (
    <div className="step05-board-phase">
      <h2 className="seven-steps-worksheet-heading">なりたい自分と、今の自分</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        目標（満足度 {theme.targetScore}）と現在（満足度 {ctx.score ?? '—'}
        ）を並べました。この違いを埋めていく計画を、後半で立てていきます。
      </p>

      <section className="step05-board" aria-label="見える化ボード">
        <p className="step05-board-domain">{ctx.domainLabel}</p>
        <p className="step05-board-goal">「{theme.goal.statement}」</p>
        <ScoreScale current={ctx.score} target={theme.targetScore} />

        <div className="step05-board-grid" role="table" aria-label="現在と目標">
          <div className="step05-board-row step05-board-row--head" role="row">
            <span role="columnheader" />
            <span role="columnheader" className="step05-board-col is-now">
              現在（{ctx.score ?? '—'}）
            </span>
            <span role="columnheader" aria-hidden />
            <span role="columnheader" className="step05-board-col is-target">
              目標（{theme.targetScore}）
            </span>
          </div>
          {STEP05_LAYERS.map((layer) =>
            items
              .filter((i) => i.layer === layer.key)
              .map((item, idx) => (
                <div key={item.id} className={`step05-board-row step05-board-row--${layer.key}`} role="row">
                  <span role="rowheader" className="step05-board-layer">
                    {idx === 0 ? (
                      <>
                        {layer.name}
                        <small>{layer.sub}</small>
                      </>
                    ) : null}
                  </span>
                  <span role="cell" className="step05-board-cell is-now">
                    {item.current}
                  </span>
                  <span role="cell" className="step05-board-arrow" aria-hidden>
                    ⇄
                  </span>
                  <span role="cell" className="step05-board-cell is-target">
                    {item.target}
                  </span>
                </div>
              ))
          )}
        </div>

        <p className="step05-board-fit">
          自分らしさ評価：
          {FIT_QUESTIONS.map((q) => `${q.label} ${fitMark(theme.fit[q.key])}`).join(' ／ ')}
        </p>
      </section>

      <div className="step03-phase-actions">
        {theme.boardConfirmedAt != null ? (
          <>
            <p className="step04-complete-badge">前半が完了しました ✓</p>
            <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onSecondHalf}>
              後半（いつまでに・道のり）へ
            </button>
          </>
        ) : (
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onConfirm}>
            このなりたい自分で進む
          </button>
        )}
      </div>
    </div>
  );
}
