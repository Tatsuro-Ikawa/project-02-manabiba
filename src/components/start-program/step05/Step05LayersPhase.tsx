'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import {
  STEP04_LAYERS,
  changeabilityLabel,
  type HaveTagId,
  type LayerTagId,
  type ReasonEntry,
} from '@/lib/startProgram/step04Constants';
import {
  STEP05_TARGET_MAX_CHARS,
  haveItemsOfReason,
  replaceHaveEntries,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import {
  loadStep05Examples,
  type Step05ExamplePersona,
} from '@/lib/startProgram/step05Examples';
import type { Step05Context } from '@/lib/startProgram/step05Context';

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
const DESIRED_IMAGE = '/start-program/seven-steps/step05/illustrations/desired.png';
const HAVE_LAYER = STEP04_LAYERS.find((layer) => layer.key === 'have') ?? STEP04_LAYERS[0];

type DraftMap = Partial<Record<HaveTagId, string>>;

function draftsFromTheme(theme: Step05Theme, reasonId: string): DraftMap {
  const out: DraftMap = {};
  for (const item of haveItemsOfReason(theme, reasonId)) {
    if (item.sourceTagId?.startsWith('have_')) {
      out[item.sourceTagId as HaveTagId] = item.target;
    }
  }
  return out;
}

function HaveModal({
  reason,
  reasonIndex,
  theme,
  onChange,
  onClose,
}: {
  reason: ReasonEntry;
  reasonIndex: number;
  theme: Step05Theme;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [drafts, setDrafts] = useState<DraftMap>(() => draftsFromTheme(theme, reason.id));
  const [checked, setChecked] = useState<Set<HaveTagId>>(
    () => new Set(Object.keys(draftsFromTheme(theme, reason.id)) as HaveTagId[])
  );
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
  const exampleIssues = selected?.issuesByLayer.have ?? [];
  const canSave = [...checked].some((id) => (drafts[id] ?? '').trim().length > 0);

  const toggle = (id: HaveTagId) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const save = () => {
    const entries = HAVE_LAYER.options
      .filter((opt) => checked.has(opt.id as HaveTagId))
      .map((opt) => ({
        tagId: opt.id as LayerTagId,
        text: clipStep05(drafts[opt.id as HaveTagId] ?? '', 'target'),
      }))
      .filter((entry) => entry.text);
    if (entries.length === 0) return;
    onChange((current) => replaceHaveEntries(current, reason.id, entries));
    onClose();
  };

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mandala-modal step05-have-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header step05-have-modal-header">
          <div className="step05-have-modal-heading">
            <h3 id={titleId} className="mandala-modal-title">
              {reason.text}
            </h3>
            <span className="step04-badge">{changeabilityLabel(reason.changeability)}</span>
          </div>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>

        <div className="mandala-modal-input-wrap step05-have-modal-body">
          <p className="step05-draw-modal-lead">課題{reasonIndex + 1}の満足する持ち方を想定してみましょう。</p>
          <p className="step04-layer-question">{HAVE_LAYER.question}</p>

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
                <p className="step05-draw-example-empty">持ち方の記入例はありません。</p>
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

          <div className="step04-options step05-have-options">
            {HAVE_LAYER.options.map((opt) => {
              const id = opt.id as HaveTagId;
              const on = checked.has(id);
              return (
                <div key={opt.id} className={`step04-option step05-have-option${on ? ' is-selected' : ''}`}>
                  <label className="step05-have-option-row">
                    <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                    <span className="step04-option-label">{opt.label}</span>
                    {!opt.isOther ? <span className="step04-option-examples">（{opt.examples}など）</span> : null}
                  </label>
                  {on ? (
                    <label className="step05-have-option-field">
                      <span className="step05-have-option-hint">
                        どのようなモノ・コトがあると、満足度になりそうですか？具体的に書いてみましょう。
                      </span>
                      <textarea
                        className="step04-reason-input step05-item-input"
                        rows={2}
                        value={drafts[id] ?? ''}
                        maxLength={STEP05_TARGET_MAX_CHARS}
                        placeholder="例：パンの衛生管理や販売の知識を身につけている"
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [id]: clipStep05(event.target.value, 'target'),
                          }))
                        }
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mandala-modal-footer step05-have-modal-footer">
          <button type="button" className="mandala-modal-btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="mandala-modal-btn mandala-modal-btn--primary"
            disabled={!canSave}
            onClick={save}
          >
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Step05LayersPhase({ ctx, theme, onChange, onNext, ready }: Step05LayersPhaseProps) {
  const [openReasonId, setOpenReasonId] = useState<string | null>(null);
  const openReason = useMemo(
    () => ctx.reasons.find((reason) => reason.id === openReasonId) ?? null,
    [ctx.reasons, openReasonId]
  );
  const openIndex = openReason ? ctx.reasons.findIndex((reason) => reason.id === openReason.id) : -1;

  return (
    <div className="step05-draw">
      <h2 className="seven-steps-worksheet-heading">望む姿を明確にしましょう</h2>
      <p className="seven-steps-worksheet-body">
        Step4 で見出した課題に対して、満足度が {theme.targetScore}{' '}
        になったときの「持ち方」を想定していきます。右のカードを選ぶと設定画面が開きます。
      </p>

      <section className="step05-draw-board" aria-label="持ち方を設定">
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

          <section className="step05-draw-settings" aria-label="満足できた自分">
            <h3 className="step05-draw-settings-title">満足できた自分</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DESIRED_IMAGE} alt="" className="step05-draw-now-img" />
            <ul className="step05-draw-now-list step05-have-cards">
              {ctx.reasons.map((reason, index) => {
                const lines = haveItemsOfReason(theme, reason.id);
                const done = lines.length > 0;
                return (
                  <li key={reason.id}>
                    <button
                      type="button"
                      className={`step05-have-card-btn${done ? ' is-done' : ''}`}
                      onClick={() => setOpenReasonId(reason.id)}
                    >
                      {done ? (
                        <ul className="step05-have-card-lines">
                          {lines.map((item) => (
                            <li key={item.id}>{item.target}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="step05-have-card-cta">
                          → 課題{index + 1}の満足する持ち方を想定してみる
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </section>

      <div className="step03-phase-actions">
        <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" disabled={!ready} onClick={onNext}>
          あり方・なし方を設定
        </button>
        {!ready ? (
          <p className="step03-phase-actions-hint">各課題に持ち方を1つ以上書いてください</p>
        ) : null}
      </div>

      {openReason ? (
        <HaveModal
          reason={openReason}
          reasonIndex={openIndex}
          theme={theme}
          onChange={onChange}
          onClose={() => setOpenReasonId(null)}
        />
      ) : null}
    </div>
  );
}
