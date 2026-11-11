'use client';

import { useState } from 'react';
import { LayerModal, type AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import { SelfList } from '@/components/start-program/step05/Step05Parts';
import {
  FIT_QUESTIONS,
  FIT_RATINGS,
  STEP05_LAYERS,
  answerSlots,
  itemsOf,
  type FitKey,
  type FitRating,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';
import type { LayerKey } from '@/lib/startProgram/step04Constants';

type Step06FitPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  ready: boolean;
  hasWeak: boolean;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
  onRate: (key: FitKey, rating: FitRating) => void;
  fitAi: AiControls;
};

const WAYS: LayerKey[] = ['do', 'be'];

/** 興味はなし方、価値観はあり方。強みはどちらの望む姿にも直しうる */
function adjustLayers(key: FitKey): LayerKey[] {
  if (key === 'interest') return ['do'];
  if (key === 'values') return ['be'];
  return ['do', 'be'];
}

export default function Step06FitPhase({
  ctx,
  theme,
  ready,
  hasWeak,
  onChange,
  onRate,
  fitAi,
}: Step06FitPhaseProps) {
  const [openLayer, setOpenLayer] = useState<LayerKey | null>(null);
  const slot = theme.ai.fit;
  const answered = Object.values(theme.fit).every((rating) => rating != null);
  const openSlots = openLayer ? answerSlots(ctx.reasons, openLayer) : [];

  return (
    <div className="step05-fit">
      <h2 className="seven-steps-worksheet-heading">なし方・あり方は、あなたの自分らしさと合っていますか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        Step2 で定めた興味・価値観・強みと照らし合わせます。合っていないと感じたら、その場で望む姿を修正できます。
        興味・価値観・強みが反映されていない目標は、<strong>長続きしにくい</strong>ものです。
      </p>

      {WAYS.map((layer) => {
        const def = STEP05_LAYERS.find((item) => item.key === layer);
        const lines = itemsOf(theme, layer)
          .map((item) => item.target.trim())
          .filter(Boolean);
        return (
          <div key={layer} className="step05-have-list-row">
            <div>
              <h3 className="step05-summary-layer-title">
                {def?.name}／{def?.sub}
              </h3>
              {lines.length === 0 ? (
                <p className="step05-summary-empty">まだ書かれていません。</p>
              ) : (
                <ul className="step05-summary-lines">
                  {lines.map((line, index) => (
                    <li key={`${index}-${line}`}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="step05-have-edit"
              disabled={answerSlots(ctx.reasons, layer).length === 0}
              onClick={() => setOpenLayer(layer)}
            >
              編集
            </button>
          </div>
        );
      })}

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
          望む姿が変わったため、AI の見立てを更新しました。
          <button type="button" className="step04-dd-link" onClick={fitAi.dismissNotice}>
            閉じる
          </button>
        </p>
      ) : null}

      <section className="step04-layer-panel" aria-label="自分らしさとの整合">
        {FIT_QUESTIONS.map((q) => {
          const rating = theme.fit[q.key];
          const advice = slot.status === 'loading' ? null : slot.data?.[q.key];
          const suggestion =
            q.key === 'strength' && advice?.suggestion
              ? advice.suggestion.replace('持ち方', 'なし方かあり方')
              : advice?.suggestion;
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
                      name={`step06-fit-${q.key}`}
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
                  {suggestion ? <p className="step05-fit-adjust-ai">{suggestion}</p> : null}
                  {adjustLayers(q.key).map((layer) => {
                    const name = STEP05_LAYERS.find((item) => item.key === layer)?.name ?? '';
                    return (
                      <button
                        key={layer}
                        type="button"
                        className="mandala-modal-btn"
                        onClick={() => setOpenLayer(layer)}
                      >
                        {name}の望む姿を修正する
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </section>

      {ready && !hasWeak ? (
        <p className="step05-fit-affirm" role="status">
          なし方・あり方は、興味・価値観・強みとつながっています。
        </p>
      ) : null}
      {answered && hasWeak ? (
        <p className="step03-phase-actions-hint">△ のままでも、この画面で望む姿を直せます。直したあとに、もう一度選べます。</p>
      ) : null}
      {!answered ? <p className="step03-phase-actions-hint">3つの問いに答えると、照合が完了します。</p> : null}

      {openLayer ? (
        <LayerModal
          layer={openLayer}
          slots={openSlots}
          theme={theme}
          onChange={onChange}
          onClose={() => setOpenLayer(null)}
        />
      ) : null}
    </div>
  );
}
