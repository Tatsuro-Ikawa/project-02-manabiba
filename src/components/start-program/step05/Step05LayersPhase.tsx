'use client';

import { useEffect, useId, useState } from 'react';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import {
  STEP05_LAYERS,
  STEP05_TARGET_MAX_CHARS,
  answerOf,
  answerSlots,
  withAnswer,
  type AnswerSlot,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import {
  loadStep05Examples,
  questionAtTarget,
  type Step05ExamplePersona,
} from '@/lib/startProgram/step05Examples';
import type { Step05Context } from '@/lib/startProgram/step05Context';
import type { LayerKey } from '@/lib/startProgram/step04Constants';

export type AiControls = {
  retry: () => void;
  refresh: () => void;
  dismissNotice?: () => void;
  stale?: boolean;
};

type Step05LayersPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
  onNext: () => void;
  ready: boolean;
};

const CURRENT_IMAGE = '/start-program/seven-steps/step05/illustrations/current.png';

function uniqueTags(slots: AnswerSlot[]): AnswerSlot[] {
  const seen = new Set<string>();
  return slots.filter((slot) => {
    if (seen.has(slot.tagId)) return false;
    seen.add(slot.tagId);
    return true;
  });
}

export function LayerModal({
  layer,
  slots,
  theme,
  onChange,
  onClose,
}: {
  layer: LayerKey;
  slots: AnswerSlot[];
  theme: Step05Theme;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const def = STEP05_LAYERS.find((item) => item.key === layer) ?? STEP05_LAYERS[0];
  const groups = ctxGroups(slots);
  const [examples, setExamples] = useState<Step05ExamplePersona[] | null>(null);
  const [exampleError, setExampleError] = useState(false);
  const [exampleId, setExampleId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStep05Examples()
      .then((list) => {
        if (!cancelled) setExamples(list);
      })
      .catch(() => {
        if (!cancelled) setExampleError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = examples?.find((persona) => persona.id === exampleId) ?? null;
  const exampleIssues = selected?.issuesByLayer[layer] ?? [];

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mandala-modal step05-draw-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            「のぞむ姿」設定画面：「{def.name}」をイメージ
          </h3>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="mandala-modal-input-wrap step05-draw-modal-body">
          <p className="step05-draw-modal-lead">
            満足度が「{theme.targetScore}」になった時の「{def.name}」を課題ごとに次の視点からイメージを言語化してみましょう。下の事例から、具体的な入力例を参考にできます。
          </p>
          <div className="step05-draw-example-switch" role="group" aria-label="参考例">
            {(examples ?? []).map((persona) => {
              const on = persona.id === exampleId;
              return (
                <button
                  key={persona.id}
                  type="button"
                  className={`step05-draw-example-btn${on ? ' is-selected' : ''}`}
                  aria-pressed={on}
                  onClick={() => setExampleId(on ? null : persona.id)}
                >
                  {persona.name}の場合
                </button>
              );
            })}
            {examples == null && !exampleError ? (
              <p className="step05-draw-example-empty">参考例を読み込んでいます。</p>
            ) : null}
            {exampleError ? <p className="step05-draw-example-empty">参考例を読み込めませんでした。</p> : null}
          </div>
          {selected ? (
            <section className="step05-draw-example" aria-label={`${selected.name}の参考例`}>
              <h4 className="step05-draw-example-title">{selected.name}の場合</h4>
              {exampleIssues.length === 0 ? (
                <p className="step05-draw-example-empty">この方向の記入例はありません。</p>
              ) : (
                exampleIssues.map((issue, index) => (
                  <div key={`${issue.text}-${index}`} className="step05-draw-example-issue">
                    <p className="step05-draw-example-issue-title">
                      課題{index + 1}：{issue.text}
                    </p>
                    {issue.points.map((point) => (
                      <div key={point.tagId}>
                        <p className="step05-draw-q">{point.question}</p>
                        <p className="step05-draw-example-answer">{point.answer}</p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </section>
          ) : null}
          {groups.map((group, index) => (
            <section key={group.reasonId} className="step05-draw-issue">
              <h4 className="step05-draw-issue-title">
                課題{index + 1}：{group.reasonText}
              </h4>
              {group.slots.map((slot) => {
                const value = answerOf(theme, slot.reasonId, slot.tagId)?.target ?? '';
                return (
                  <label key={slot.tagId} className="step05-draw-question">
                    <span className="step05-draw-q">{questionAtTarget(slot.tagId)}</span>
                    <textarea
                      className="step04-reason-input step05-item-input"
                      rows={3}
                      value={value}
                      maxLength={STEP05_TARGET_MAX_CHARS}
                      onChange={(event) =>
                        onChange((current) => withAnswer(current, slot, clipStep05(event.target.value, 'target')))
                      }
                    />
                  </label>
                );
              })}
            </section>
          ))}
        </div>
        <footer className="mandala-modal-footer step05-draw-modal-footer">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}

function ctxGroups(slots: AnswerSlot[]): { reasonId: string; reasonText: string; slots: AnswerSlot[] }[] {
  const groups: { reasonId: string; reasonText: string; slots: AnswerSlot[] }[] = [];
  for (const slot of slots) {
    const hit = groups.find((group) => group.reasonId === slot.reasonId);
    if (hit) hit.slots.push(slot);
    else groups.push({ reasonId: slot.reasonId, reasonText: slot.reasonText, slots: [slot] });
  }
  return groups;
}

export default function Step05LayersPhase({ ctx, theme, onChange, onNext, ready }: Step05LayersPhaseProps) {
  const [openLayer, setOpenLayer] = useState<LayerKey | null>(null);
  const openSlots = openLayer ? answerSlots(ctx.reasons, openLayer) : [];

  return (
    <div className="step05-draw">
      <h2 className="seven-steps-worksheet-heading">
        満足度が {theme.targetScore} になったあなたの「持ち方」を描いてみましょう
      </h2>
      <p className="seven-steps-worksheet-body">
        Step4 で深掘りした「持ち方」で必要と捉えた内容をもとに、目標とする満足度のイメージを描いていきます。
        <strong className="step05-draw-em">設定エリア</strong>
        のカードを押すと「望む姿」設定画面が表示されますので、課題ごとにイメージを固めていきましょう。
      </p>

      <section className="step05-draw-board" aria-label="目標を描く">
        <div className="step05-draw-wedge" aria-hidden>
          <span className="step05-draw-score">
            <span>満足度</span>
            <strong>{ctx.score ?? '—'}</strong>
          </span>
          <span className="step05-draw-slope" />
          <span className="step05-draw-score">
            <span>満足度</span>
            <strong>{theme.targetScore}</strong>
          </span>
        </div>

        <div className="step05-draw-columns">
          <section className="step05-draw-now" aria-label="現在の自分">
            <h3 className="step05-draw-now-title">現在の自分</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CURRENT_IMAGE} alt="" className="step05-draw-now-img" />
            <ul className="step05-draw-now-list">
              {ctx.reasons.map((reason) => (
                <li key={reason.id}>{reason.text}</li>
              ))}
            </ul>
          </section>

          <section className="step05-draw-settings" aria-label="設定エリア">
            <h3 className="step05-draw-settings-title">設定エリア</h3>
            {STEP05_LAYERS.filter((layer) => layer.key === 'have').map((layer) => {
              const slots = answerSlots(ctx.reasons, layer.key);
              const filled = slots.filter((slot) => (answerOf(theme, slot.reasonId, slot.tagId)?.target.trim() ?? '') !== '');
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
          持ち方をまとめる
        </button>
        {!ready ? <p className="step03-phase-actions-hint">持ち方の欄をすべて書いてください</p> : null}
        <p className="seven-steps-worksheet-hint">なし方・あり方は、次のステップで扱います。</p>
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
