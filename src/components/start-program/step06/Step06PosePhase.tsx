'use client';

import { useState } from 'react';
import { LayerModal } from '@/components/start-program/step05/Step05LayersPhase';
import {
  STEP05_LAYERS,
  answerOf,
  answerSlots,
  type AnswerSlot,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';
import type { LayerKey } from '@/lib/startProgram/step04Constants';

type Step06PosePhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  ready: boolean;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
  onNext: () => void;
};

const WAYS: LayerKey[] = ['do', 'be'];

function uniqueTags(slots: AnswerSlot[]): AnswerSlot[] {
  const seen = new Set<string>();
  return slots.filter((slot) => {
    if (seen.has(slot.tagId)) return false;
    seen.add(slot.tagId);
    return true;
  });
}

export default function Step06PosePhase({ ctx, theme, ready, onChange, onNext }: Step06PosePhaseProps) {
  const [openLayer, setOpenLayer] = useState<LayerKey | null>(null);
  const openSlots = openLayer ? answerSlots(ctx.reasons, openLayer) : [];
  const layers = STEP05_LAYERS.filter((layer) => WAYS.includes(layer.key));

  return (
    <div className="step05-draw">
      <h2 className="seven-steps-worksheet-heading">
        満足度が {theme.targetScore} になったときの「なし方」と「あり方」を描きましょう
      </h2>
      <p className="seven-steps-worksheet-body">
        Step4 で選んだ「なし方」「あり方」をもとに、望む姿を書きます。Step5
        で書いた内容があれば、その続きから直せます。
        <strong className="step05-draw-em">設定エリア</strong>
        のカードを押すと「望む姿」設定画面が開きます。
      </p>

      <section className="step05-draw-board" aria-label="望む姿を設定">
        <div className="step05-draw-columns">
          <section className="step05-draw-now" aria-label="現在の自分">
            <h3 className="step05-draw-now-title">現在の自分</h3>
            <ul className="step05-draw-now-list">
              {ctx.reasons.map((reason) => (
                <li key={reason.id}>{reason.text}</li>
              ))}
            </ul>
          </section>

          <section className="step05-draw-settings" aria-label="設定エリア">
            <h3 className="step05-draw-settings-title">設定エリア</h3>
            {layers.map((layer) => {
              const slots = answerSlots(ctx.reasons, layer.key);
              const filled = slots.filter(
                (slot) => (answerOf(theme, slot.reasonId, slot.tagId)?.target.trim() ?? '') !== ''
              );
              const done = slots.length > 0 && filled.length === slots.length;
              return (
                <button
                  key={layer.key}
                  type="button"
                  className={`step05-draw-card${done ? ' is-done' : ''}`}
                  disabled={slots.length === 0}
                  onClick={() => setOpenLayer(layer.key)}
                >
                  <span className="step05-draw-card-title">
                    目標とする「{layer.name}」を設定
                    {done ? <span className="step05-draw-card-check">✓</span> : null}
                  </span>
                  {slots.length === 0 ? (
                    <span className="step05-draw-card-empty">Step4 で選んだ項目はありません</span>
                  ) : (
                    <span className="step05-draw-chips">
                      {uniqueTags(slots).map((slot) => (
                        <span key={slot.tagId} className="step05-draw-chip">
                          {slot.label}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </section>
        </div>
      </section>

      <div className="step03-phase-actions">
        <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" disabled={!ready} onClick={onNext}>
          自分らしさと照らす
        </button>
        {!ready ? (
          <p className="step03-phase-actions-hint">なし方・あり方の欄をすべて書いてください</p>
        ) : null}
      </div>

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
