'use client';

import { useEffect, useId, useState } from 'react';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import {
  STEP05_LAYERS,
  STEP05_TARGET_MAX_CHARS,
  answerOf,
  withAnswer,
  type AnswerSlot,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import {
  loadStep05Examples,
  questionAtTarget,
  type Step05ExamplePersona,
} from '@/lib/startProgram/step05Examples';
import type { LayerKey } from '@/lib/startProgram/step04Constants';

/** Step6 など、旧来の方向別設定モーダル（課題×タグ） */
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
