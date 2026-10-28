'use client';

import { SelfList } from '@/components/start-program/step05/Step05Parts';
import type { AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import {
  FIT_QUESTIONS,
  FIT_RATINGS,
  STEP05_LAYERS,
  itemsOf,
  type FitKey,
  type FitRating,
  type Step05Progress,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';

type Step05FitPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  progress: Step05Progress;
  onRate: (key: FitKey, rating: FitRating) => void;
  fitAi: AiControls;
  onBackToLayers: () => void;
  onNext: () => void;
};

export function GoalSummary({ theme }: { theme: Step05Theme }) {
  return (
    <section className="step05-summary" aria-label="なりたい自分">
      <p className="step05-summary-goal">「{theme.goal.statement}」</p>
      <dl className="step05-summary-list">
        {STEP05_LAYERS.map((l) => (
          <div key={l.key} className={`step05-summary-row step05-summary-row--${l.key}`}>
            <dt>
              {l.name}／{l.sub}
            </dt>
            <dd>
              {itemsOf(theme, l.key)
                .filter((i) => i.target.trim())
                .map((i) => (
                  <span key={i.id}>{i.target}</span>
                ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function Step05FitPhase({
  ctx,
  theme,
  progress,
  onRate,
  fitAi,
  onBackToLayers,
  onNext,
}: Step05FitPhaseProps) {
  const slot = theme.ai.fit;
  const answered = Object.values(theme.fit).every((v) => v != null);

  return (
    <div className="step05-fit">
      <h2 className="seven-steps-worksheet-heading">この目標は、あなたらしいですか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        興味・価値観・強みが反映されていない目標は、<strong>長続きしにくい</strong>ものです。Step2
        で見つけた自分らしさと照らし合わせて、3つの問いに答えましょう。
      </p>

      <GoalSummary theme={theme} />

      {slot.status === 'error' ? (
        <p className="step04-dd-notice is-error" role="alert">
          AI の見立てを準備できませんでした。
          <button type="button" className="step04-dd-link" onClick={fitAi.retry}>
            もう一度
          </button>
        </p>
      ) : null}
      {slot.refreshedNotice && slot.status !== 'loading' ? (
        <p className="step04-dd-notice" role="status">
          目標が変わったため、AI の見立てを更新しました。
          <button type="button" className="step04-dd-link" onClick={fitAi.dismissNotice}>
            閉じる
          </button>
        </p>
      ) : null}

      <section className="step04-layer-panel" aria-label="自分らしさの評価">
        {FIT_QUESTIONS.map((q) => {
          const rating = theme.fit[q.key];
          const advice = slot.status === 'loading' ? null : slot.data?.[q.key];
          return (
            <section key={q.key} className={`step04-layer step05-fit-q step05-fit-q--${q.key}`}>
              <h3 className="step04-layer-name step05-layer-name">
                {q.label}
                <span className="step05-layer-sub">{q.question}</span>
              </h3>
              <div className="step05-fit-ref">
                <p className="step05-ref-sub">Step2 の{q.label}</p>
                <SelfList items={ctx.self[q.key]} empty="（Step2 の文は未記入）" />
              </div>
              {advice ? (
                <p className="step05-fit-comment">
                  <span className="step05-ai-label">AI の見立て</span>
                  {advice.comment}
                </p>
              ) : slot.status === 'loading' ? (
                <p className="step04-dd-preparing">AI が見立てを準備しています…</p>
              ) : null}
              <div className="step04-choices" role="radiogroup" aria-label={q.question}>
                {FIT_RATINGS.map((r) => (
                  <label key={r.id} className={`step04-choice${rating === r.id ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name={`step05-fit-${q.key}`}
                      checked={rating === r.id}
                      onChange={() => onRate(q.key, r.id)}
                    />
                    {r.mark} {r.label}
                  </label>
                ))}
              </div>
              {rating === 'weak' ? (
                <div className="step05-fit-adjust">
                  <p className="step05-fit-adjust-q">目標に{q.label}を取り入れるとしたら？</p>
                  {advice?.suggestion ? <p className="step05-fit-adjust-ai">{advice.suggestion}</p> : null}
                  <button type="button" className="mandala-modal-btn" onClick={onBackToLayers}>
                    目標を描くに戻って調整する
                  </button>
                </div>
              ) : null}
            </section>
          );
        })}
      </section>

      {answered && !progress.hasWeakFit ? (
        <p className="step05-fit-affirm" role="status">
          自分らしい目標です。興味・価値観・強みが、なりたい自分の中に生きています。
        </p>
      ) : null}

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!progress.fitReady}
          onClick={onNext}
        >
          今の自分を書く
        </button>
        {!answered ? (
          <p className="step03-phase-actions-hint">3つの問いに答えると進めます</p>
        ) : progress.hasWeakFit ? (
          <p className="step03-phase-actions-hint">△ のままでも先へ進めます。あとで戻って調整することもできます。</p>
        ) : null}
      </div>
    </div>
  );
}
