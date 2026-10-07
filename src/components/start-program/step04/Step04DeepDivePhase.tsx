'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Step04DeepDiveCard, { type DeepDiveStage } from '@/components/start-program/step04/Step04DeepDiveCard';
import {
  Step04DeepDiveEntryModal,
  Step04DeepDiveInnerModal,
  Step04DeepDiveWorkingModal,
} from '@/components/start-program/step04/Step04DeepDiveModals';
import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import {
  generateEntryOptions,
  generateInnerOptions,
  generateWorkingHypotheses,
} from '@/lib/startProgram/step04DeepDiveAi';
import {
  baseEntryOptions,
  baseInnerOptions,
  buildDeepDiveContext,
  emptyDeepDiveEntry,
  entryInputKey,
  innerInputKey,
  picks,
  workingInputKey,
  type AiSlot,
  type DeepDiveEntry,
} from '@/lib/startProgram/step04DeepDiveConstants';
import { actionableReasons, deepDiveTargets, type Step04Theme } from '@/lib/startProgram/step04Constants';

type PatchFn = (domainId: MandalaDomainId, reasonId: string, fn: (e: DeepDiveEntry) => DeepDiveEntry) => void;

type Step04DeepDivePhaseProps = {
  theme: Step04Theme;
  patchDeepDive: PatchFn;
  onBackToLayers: () => void;
};

function withSlot(dd: DeepDiveEntry, stage: DeepDiveStage, fn: (s: AiSlot<unknown>) => AiSlot<unknown>): DeepDiveEntry {
  if (stage === 'entry') {
    return { ...dd, entry: { ...dd.entry, options: fn(dd.entry.options as AiSlot<unknown>) as typeof dd.entry.options } };
  }
  if (stage === 'inner') {
    return { ...dd, inner: { ...dd.inner, options: fn(dd.inner.options as AiSlot<unknown>) as typeof dd.inner.options } };
  }
  return {
    ...dd,
    working: { ...dd.working, hypotheses: fn(dd.working.hypotheses as AiSlot<unknown>) as typeof dd.working.hypotheses },
  };
}

function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** こころの深掘り：課題＋あり方 → 深掘り① → 深掘り② → こころの働き（AI は各段階の手前で先読み） */
export default function Step04DeepDivePhase({ theme, patchDeepDive, onBackToLayers }: Step04DeepDivePhaseProps) {
  const domainId = theme.domainId;
  const targets = deepDiveTargets(theme);
  const actionable = actionableReasons(theme);
  const [open, setOpen] = useState<{ reasonId: string; stage: DeepDiveStage } | null>(null);
  const inflight = useRef(new Set<string>());

  const runAi = useCallback(
    (
      reasonId: string,
      stage: DeepDiveStage,
      key: string,
      gen: () => Promise<unknown>,
      opts: { notice: boolean; refresh?: boolean }
    ) => {
      const flag = `${reasonId}:${stage}:${key}:${opts.refresh ? 'refresh' : 'auto'}`;
      if (inflight.current.has(flag)) return;
      inflight.current.add(flag);
      patchDeepDive(domainId, reasonId, (dd) => withSlot(dd, stage, (s) => ({ ...s, status: 'loading' })));
      gen()
        .then((data) =>
          patchDeepDive(domainId, reasonId, (dd) =>
            withSlot(dd, stage, (s) => ({
              ...s,
              status: 'ready',
              data,
              inputKey: key,
              refreshCount: opts.refresh ? s.refreshCount + 1 : s.refreshCount,
              refreshedNotice: opts.refresh ? s.refreshedNotice : opts.notice,
            }))
          )
        )
        .catch(() =>
          patchDeepDive(domainId, reasonId, (dd) => withSlot(dd, stage, (s) => ({ ...s, status: 'error', inputKey: key })))
        )
        .finally(() => inflight.current.delete(flag));
    },
    [domainId, patchDeepDive]
  );

  // 先読み：入力（前段の回答）が変わった段階だけ AI を裏で実行する
  useEffect(() => {
    for (const reason of targets) {
      const dd = theme.deepDive[reason.id] ?? emptyDeepDiveEntry(reason.id);
      const ctx = buildDeepDiveContext(domainId, reason);
      const eKey = entryInputKey(ctx);
      if (dd.entry.options.inputKey !== eKey) {
        runAi(reason.id, 'entry', eKey, () => generateEntryOptions(ctx), { notice: dd.entry.savedAt != null });
      }
      if (dd.entry.savedAt != null) {
        const iKey = innerInputKey(ctx, dd);
        if (dd.inner.options.inputKey !== iKey) {
          const entry = { scenes: picks(dd.entry.scene), actions: picks(dd.entry.action) };
          runAi(reason.id, 'inner', iKey, () => generateInnerOptions(ctx, entry), { notice: dd.inner.savedAt != null });
        }
      }
      if (dd.inner.savedAt != null) {
        const wKey = workingInputKey(ctx, dd);
        if (dd.working.hypotheses.inputKey !== wKey) {
          runAi(reason.id, 'working', wKey, () => generateWorkingHypotheses(ctx, dd), {
            notice: dd.working.savedAt != null,
          });
        }
      }
    }
  }, [domainId, runAi, targets, theme.deepDive]);

  const openReason = open ? targets.find((r) => r.id === open.reasonId) : undefined;
  const openDd = openReason ? theme.deepDive[openReason.id] ?? emptyDeepDiveEntry(openReason.id) : undefined;
  const openIndex = openReason ? actionable.findIndex((r) => r.id === openReason.id) + 1 : 0;
  const completedCount = targets.filter((r) => theme.deepDive[r.id]?.insightSavedAt != null).length;

  const retry = (reasonId: string, stage: DeepDiveStage) =>
    patchDeepDive(domainId, reasonId, (dd) => withSlot(dd, stage, (s) => ({ ...s, status: 'idle', inputKey: null })));

  if (targets.length === 0) {
    return (
      <div className="step04-deepdive">
        <h2 className="seven-steps-worksheet-heading">こころの深掘り</h2>
        <p className="seven-steps-worksheet-body">
          「あり方」を選んだ課題がないため、深掘りを始められません。「何が変わればよい？」で、あり方を1つ以上選んでください。
        </p>
        <div className="step03-phase-actions">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onBackToLayers}>
            「何が変わればよい？」へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step04-deepdive">
      <h2 className="seven-steps-worksheet-heading">
        整理した結果から、「あり方：ものごとの捉え方」についてさらに深掘りしてみましょう。
      </h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        「あり方」を選んだ次の課題から、幾つかの質問に答えながら探っていきます。1つ以上の課題で「この気づきを保存する」まで進むと Step4 は完了です（残りの課題は任意です）。
      </p>
      {completedCount > 0 ? (
        <p className="step04-dd-complete" role="status">
          Step4 は完了しています（気づきを保存した課題 {completedCount} / {targets.length}）
        </p>
      ) : null}

      <h3 className="step03-sat-section-label">自分から変えられそうな課題</h3>
      <div className="step04-dd-cards">
        {targets.map((reason) => (
          <Step04DeepDiveCard
            key={reason.id}
            index={actionable.findIndex((r) => r.id === reason.id) + 1}
            reason={reason}
            dd={theme.deepDive[reason.id] ?? emptyDeepDiveEntry(reason.id)}
            onExplore={(stage) => setOpen({ reasonId: reason.id, stage })}
            onSaveInsight={() =>
              patchDeepDive(domainId, reason.id, (dd) => ({ ...dd, insightSavedAt: Date.now() }))
            }
          />
        ))}
      </div>

      {open && openReason && openDd && open.stage === 'entry' ? (
        <Step04DeepDiveEntryModal
          index={openIndex}
          reasonText={openReason.text}
          dd={openDd}
          fallback={baseEntryOptions(buildDeepDiveContext(domainId, openReason))}
          onRetry={() => retry(openReason.id, 'entry')}
          onRefresh={() => {
            const ctx = buildDeepDiveContext(domainId, openReason);
            const variant = openDd.entry.options.refreshCount + 1;
            runAi(openReason.id, 'entry', entryInputKey(ctx), () => generateEntryOptions(ctx, variant), {
              notice: false,
              refresh: true,
            });
          }}
          onSave={(scene, action) => {
            patchDeepDive(domainId, openReason.id, (dd) => {
              const edited = changed([scene, action], [dd.entry.scene, dd.entry.action]);
              return {
                ...dd,
                entry: {
                  ...dd.entry,
                  scene,
                  action,
                  savedAt: Date.now(),
                  options: { ...dd.entry.options, refreshedNotice: false },
                },
                insightSavedAt: edited ? null : dd.insightSavedAt,
              };
            });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}

      {open && openReason && openDd && open.stage === 'inner' ? (
        <Step04DeepDiveInnerModal
          index={openIndex}
          reasonText={openReason.text}
          dd={openDd}
          fallback={baseInnerOptions()}
          onRetry={() => retry(openReason.id, 'inner')}
          onRefresh={() => {
            const ctx = buildDeepDiveContext(domainId, openReason);
            const variant = openDd.inner.options.refreshCount + 1;
            const entry = { scenes: picks(openDd.entry.scene), actions: picks(openDd.entry.action) };
            runAi(openReason.id, 'inner', innerInputKey(ctx, openDd), () => generateInnerOptions(ctx, entry, variant), {
              notice: false,
              refresh: true,
            });
          }}
          onSave={(v) => {
            patchDeepDive(domainId, openReason.id, (dd) => {
              const before = {
                feeling: dd.inner.feeling,
                voice: dd.inner.voice,
                voiceOwnWords: dd.inner.voiceOwnWords,
                protection: dd.inner.protection,
              };
              return {
                ...dd,
                inner: { ...dd.inner, ...v, savedAt: Date.now(), options: { ...dd.inner.options, refreshedNotice: false } },
                insightSavedAt: changed(v, before) ? null : dd.insightSavedAt,
              };
            });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}

      {open && openReason && openDd && open.stage === 'working' ? (
        <Step04DeepDiveWorkingModal
          index={openIndex}
          reasonText={openReason.text}
          dd={openDd}
          onRetry={() => retry(openReason.id, 'working')}
          onSave={(v) => {
            patchDeepDive(domainId, openReason.id, (dd) => ({
              ...dd,
              working: {
                ...dd.working,
                ...v,
                savedAt: Date.now(),
                hypotheses: { ...dd.working.hypotheses, refreshedNotice: false },
              },
              insightSavedAt: changed(v, { ratings: dd.working.ratings, ownWords: dd.working.ownWords })
                ? null
                : dd.insightSavedAt,
            }));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
