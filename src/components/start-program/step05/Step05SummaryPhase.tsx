'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import { stepUrl } from '@/lib/startProgram/sevenStepsConstants';
import {
  FIT_QUESTIONS,
  STEP05_TARGET_MAX_CHARS,
  createStep05ActionId,
  emptyHavePlan,
  haveItems,
  havePlanOf,
  type FitKey,
  type Step05AcceleratorRef,
  type Step05DoAction,
  type Step05HavePlan,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';

type Step05SummaryPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
};

function withPlan(theme: Step05Theme, haveId: string, plan: Step05HavePlan): Step05Theme {
  return { ...theme, havePlans: { ...theme.havePlans, [haveId]: plan } };
}

function DoActionModal({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [text, setText] = useState(initial);
  const canSave = text.trim().length > 0;

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mandala-modal step05-do-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            なし方（行動）を書く
          </h3>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="mandala-modal-input-wrap">
          <p className="seven-steps-worksheet-body">持ち方を実現するために、どんな行動をイメージしますか？</p>
          <textarea
            className="step04-reason-input step05-item-input"
            rows={3}
            value={text}
            maxLength={STEP05_TARGET_MAX_CHARS}
            placeholder="例：試作したパンを家族に食べてもらう"
            autoFocus
            onChange={(event) => setText(clipStep05(event.target.value, 'target'))}
          />
        </div>
        <footer className="mandala-modal-footer step05-have-modal-footer">
          <button type="button" className="mandala-modal-btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="mandala-modal-btn mandala-modal-btn--primary"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave(text.trim());
              onClose();
            }}
          >
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Step05SummaryPhase({ ctx, theme, onChange }: Step05SummaryPhaseProps) {
  const router = useRouter();
  const haves = haveItems(theme);
  const selectedHaveId = theme.selectedHaveId && haves.some((h) => h.id === theme.selectedHaveId)
    ? theme.selectedHaveId
    : null;
  const plan = selectedHaveId ? havePlanOf(theme, selectedHaveId) : emptyHavePlan();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(plan.startActionId);
  const [editAction, setEditAction] = useState<Step05DoAction | null | 'new'>(null);

  useEffect(() => {
    setSelectedActionId(plan.startActionId);
  }, [selectedHaveId, plan.startActionId]);

  const activeActionId =
    selectedActionId && plan.actions.some((a) => a.id === selectedActionId)
      ? selectedActionId
      : plan.startActionId;

  const accelerators = activeActionId ? plan.acceleratorsByAction[activeActionId] ?? [] : [];
  const acceleratorSet = useMemo(
    () => new Set(accelerators.map((a) => `${a.key}::${a.text}`)),
    [accelerators]
  );

  const selfGroups = FIT_QUESTIONS.map((q) => ({
    key: q.key,
    label: q.label,
    sentences: ctx.self[q.key] ?? [],
  }));
  const hasAnySelf = selfGroups.some((g) => g.sentences.length > 0);

  const patchPlan = (fn: (p: Step05HavePlan) => Step05HavePlan) => {
    if (!selectedHaveId) return;
    onChange((current) => withPlan(current, selectedHaveId, fn(havePlanOf(current, selectedHaveId))));
  };

  const selectHave = (haveId: string) => {
    onChange((current) => ({ ...current, selectedHaveId: haveId }));
  };

  const selectStartAction = (actionId: string) => {
    setSelectedActionId(actionId);
    patchPlan((p) => ({ ...p, startActionId: actionId }));
  };

  const toggleAccelerator = (key: FitKey, text: string) => {
    if (!activeActionId) return;
    const ref: Step05AcceleratorRef = { key, text };
    const token = `${key}::${text}`;
    patchPlan((p) => {
      const list = p.acceleratorsByAction[activeActionId] ?? [];
      const next = list.some((a) => `${a.key}::${a.text}` === token)
        ? list.filter((a) => `${a.key}::${a.text}` !== token)
        : [...list, ref];
      return {
        ...p,
        acceleratorsByAction: { ...p.acceleratorsByAction, [activeActionId]: next },
      };
    });
  };

  const saveAction = (text: string) => {
    if (editAction === 'new') {
      const action: Step05DoAction = { id: createStep05ActionId(), text };
      patchPlan((p) => {
        const actions = [...p.actions, action];
        return {
          ...p,
          actions,
          startActionId: p.startActionId ?? action.id,
        };
      });
      setSelectedActionId(action.id);
      return;
    }
    if (editAction) {
      const id = editAction.id;
      patchPlan((p) => ({
        ...p,
        actions: p.actions.map((a) => (a.id === id ? { ...a, text } : a)),
      }));
    }
  };

  const deleteAction = () => {
    if (!activeActionId) return;
    patchPlan((p) => {
      const actions = p.actions.filter((a) => a.id !== activeActionId);
      const acceleratorsByAction = { ...p.acceleratorsByAction };
      delete acceleratorsByAction[activeActionId];
      const startActionId =
        p.startActionId === activeActionId ? (actions[0]?.id ?? null) : p.startActionId;
      return { actions, startActionId, acceleratorsByAction };
    });
    setSelectedActionId(null);
  };

  return (
    <div className="step05-link">
      <h2 className="seven-steps-worksheet-heading">望む姿を明確にしましょう</h2>
      <p className="seven-steps-worksheet-body">
        満足度が {theme.targetScore}{' '}
        の「持ち方」を実現する「なし方」をイメージし、それを支える「こころのアクセル」をあり方として紐づけます。
      </p>

      <section className="step05-link-section" aria-label="持ち方を選択">
        <h3 className="step05-link-title">持ち方を選択</h3>
        <p className="seven-steps-worksheet-body">
          前ページで設定した内容から、いちばん実現しやすいものを選んでください。
        </p>
        {haves.length === 0 ? (
          <p className="step05-summary-empty">持ち方がまだありません。前のプロセスで設定してください。</p>
        ) : (
          <ul className="step05-link-list">
            {haves.map((item) => (
              <li key={item.id}>
                <label className={`step05-link-option${selectedHaveId === item.id ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="step05-have"
                    checked={selectedHaveId === item.id}
                    onChange={() => selectHave(item.id)}
                  />
                  <span>{item.target}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="step05-link-section" aria-label="なし方">
        <h3 className="step05-link-title">なし方：行動をイメージする</h3>
        <p className="seven-steps-worksheet-body">
          上記を実現するための行動を挙げ、いちばん始められそうなものを選んでください。
        </p>
        {!selectedHaveId ? (
          <p className="step05-summary-empty">先に持ち方を選んでください。</p>
        ) : (
          <>
            {plan.actions.length === 0 ? (
              <p className="step05-summary-empty">まだ行動がありません。「追加」から書いてください。</p>
            ) : (
              <ul className="step05-link-list step05-link-list--do">
                {plan.actions.map((action) => (
                  <li key={action.id}>
                    <label
                      className={`step05-link-option${activeActionId === action.id ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="step05-do"
                        checked={activeActionId === action.id}
                        onChange={() => selectStartAction(action.id)}
                      />
                      <span>{action.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="step05-link-actions">
              <button type="button" className="mandala-modal-btn" onClick={() => setEditAction('new')}>
                追加
              </button>
              <button
                type="button"
                className="mandala-modal-btn"
                disabled={!activeActionId}
                onClick={() => {
                  const hit = plan.actions.find((a) => a.id === activeActionId);
                  if (hit) setEditAction(hit);
                }}
              >
                編集
              </button>
              <button
                type="button"
                className="mandala-modal-btn"
                disabled={!activeActionId}
                onClick={deleteAction}
              >
                削除
              </button>
            </div>
          </>
        )}
      </section>

      <section className="step05-link-section" aria-label="あり方を紐づける">
        <h3 className="step05-link-title">あり方（こころのアクセル）を紐づける</h3>
        <p className="seven-steps-worksheet-body">
          選んだ行動を支える「こころのアクセル」を、Step2 で深掘りした文から選んでください（複数可）。
        </p>
        {!selectedHaveId || !activeActionId ? (
          <p className="step05-summary-empty">先に持ち方と、始められそうななし方を選んでください。</p>
        ) : !hasAnySelf ? (
          <div className="step05-link-guide" role="status">
            <p>Step2 の興味・価値観・強みの文がまだありません。こころのアクセルを用意してから戻ってきてください。</p>
            <div className="step05-link-guide-actions">
              <button
                type="button"
                className="mandala-modal-btn mandala-modal-btn--primary"
                onClick={() => router.push(stepUrl(2, 'worksheet'))}
              >
                Step2 へ進む
              </button>
              <p className="seven-steps-worksheet-hint">
                アクセルが無い場合は、上の持ち方・なし方の選択を変えるか、Step2 で文を追加してください。
              </p>
            </div>
          </div>
        ) : (
          <div className="step05-link-accels">
            {selfGroups.map((group) =>
              group.sentences.length === 0 ? null : (
                <fieldset key={group.key} className="step05-link-accel-group">
                  <legend>{group.label}</legend>
                  <ul className="step05-link-list">
                    {group.sentences.map((sentence) => {
                      const on = acceleratorSet.has(`${group.key}::${sentence}`);
                      return (
                        <li key={`${group.key}-${sentence}`}>
                          <label className={`step05-link-option${on ? ' is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleAccelerator(group.key, sentence)}
                            />
                            <span>{sentence}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              )
            )}
            {accelerators.length === 0 ? (
              <p className="step03-phase-actions-hint">アクセルを1つ以上選んでください</p>
            ) : null}
          </div>
        )}
      </section>

      {editAction != null ? (
        <DoActionModal
          initial={editAction === 'new' ? '' : editAction.text}
          onSave={saveAction}
          onClose={() => setEditAction(null)}
        />
      ) : null}
    </div>
  );
}
