'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AccessNotice,
  SaveStatusBadge,
  SubscribeModal,
} from '@/components/start-program/access/StartProgramAccessParts';
import Step05BoardPhase from '@/components/start-program/step05/Step05BoardPhase';
import Step05CurrentPhase from '@/components/start-program/step05/Step05CurrentPhase';
import Step05FitPhase from '@/components/start-program/step05/Step05FitPhase';
import Step05GapPhase from '@/components/start-program/step05/Step05GapPhase';
import Step05MarkersPhase from '@/components/start-program/step05/Step05MarkersPhase';
import Step05PeriodPhase from '@/components/start-program/step05/Step05PeriodPhase';
import Step05RiskPhase from '@/components/start-program/step05/Step05RiskPhase';
import Step05TimelinePhase from '@/components/start-program/step05/Step05TimelinePhase';
import Step05LayersPhase, { type AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import Step05SummaryPhase from '@/components/start-program/step05/Step05SummaryPhase';
import { Step05PhaseNav } from '@/components/start-program/step05/Step05Parts';
import Step05ReviewPhase from '@/components/start-program/step05/Step05ReviewPhase';
import { useMandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import { useSaveStatusMock } from '@/hooks/useSaveStatusMock';
import { useStartProgramAccess } from '@/hooks/useStartProgramAccess';
import { useStartProgramAppSettings } from '@/hooks/useStartProgramAppSettings';
import { useStep03SatisfactionStore } from '@/hooks/useStep03SatisfactionStore';
import { useStep04BrakeExploreStore } from '@/hooks/useStep04BrakeExploreStore';
import { newStep05Theme, useStep05DesiredStateStore } from '@/hooks/useStep05DesiredStateStore';
import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import { stepUrl } from '@/lib/startProgram/sevenStepsConstants';
import { step04Progress } from '@/lib/startProgram/step04Constants';
import type { AiSlot } from '@/lib/startProgram/step04DeepDiveConstants';
import {
  generateCurrentDrafts,
  generateFitAdvice,
  generateGoalStatements,
  generateLayerCandidates,
} from '@/lib/startProgram/step05Ai';
import {
  currentsInputKey,
  fitInputKey,
  goalsInputKey,
  parseStep05Phase,
  formatHaveSummary,
  step05Progress,
  type Step05Phase,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import {
  buildStep05Context,
  candidatesInputKey,
  readSelfSentences,
  seedItems,
  type SelfSentences,
} from '@/lib/startProgram/step05Context';
import { generateGapDrafts, generateMarkerDrafts, generateMilestoneDrafts } from '@/lib/startProgram/step05PlanAi';
import {
  gapsInputKey,
  markersInputKey,
  milestonesInputKey,
  periodProblem,
  satisfactionMarker,
  step05PlanProgress,
  withSatisfactionMarker,
  type Step05PlanDraft,
} from '@/lib/startProgram/step05PlanConstants';

type AiKey = keyof Step05Theme['ai'];

/**
 * Step5 前半：ふりかえりと目標 → 3方向で描く → 自分らしさ → 現在の姿 → 見える化
 * Step5 後半：違いを見る → 到達のしるし → いつまでに → 振れ幅 → 道のり
 */
export default function Step05WorksheetPane() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPhase = searchParams.get('phase');

  const { store: step01, hydrated: step01Hydrated } = useMandalaLocalStore();
  const { store: step03, hydrated: step03Hydrated } = useStep03SatisfactionStore();
  const { activeTheme: theme4, hydrated: step04Hydrated } = useStep04BrakeExploreStore();
  const { settings, hydrated: settingsHydrated } = useStartProgramAppSettings();
  const { store, hydrated, ensureTheme, patchTheme } = useStep05DesiredStateStore();
  const [self, setSelf] = useState<SelfSentences | null>(null);
  const accessHook = useStartProgramAccess();
  const { access } = accessHook;
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  useEffect(() => {
    setSelf(readSelfSentences());
  }, []);

  const ready =
    hydrated &&
    step01Hydrated &&
    step03Hydrated &&
    step04Hydrated &&
    settingsHydrated &&
    self != null &&
    access != null;
  const readOnly = access?.status === 'expired';
  const step4Done = step04Progress(theme4, settings.step04ReasonMin).completed;
  const ctx = useMemo(
    () => (theme4 && self ? buildStep05Context(step01, step03, theme4, self) : null),
    [self, step01, step03, theme4]
  );
  const domainId = ctx?.domainId ?? null;
  const theme = domainId ? store.themes[domainId] : undefined;
  const progress = step05Progress(theme, ctx?.reasons ?? []);
  const planProgress = step05PlanProgress(theme, progress.completed);
  const saveStatus = useSaveStatusMock(theme);

  useEffect(() => {
    if (!ready || readOnly || !ctx || !step4Done || theme) return;
    ensureTheme(ctx.domainId, () => newStep05Theme(ctx.domainId, seedItems(ctx)));
  }, [ctx, ensureTheme, readOnly, ready, step4Done, theme]);

  const unlocked: Record<Step05Phase, boolean> = {
    review: step4Done && theme != null,
    layers: progress.reviewDone,
    summary: progress.layersFilled,
    fit: false,
    current: false,
    board: false,
    gap: false,
    markers: false,
    period: false,
    risk: false,
    timeline: false,
  };
  const done: Record<Step05Phase, boolean> = {
    review: progress.reviewDone,
    layers: progress.layersFilled,
    summary: progress.layersReady,
    fit: false,
    current: false,
    board: false,
    gap: false,
    markers: false,
    period: false,
    risk: false,
    timeline: false,
  };
  const order: Step05Phase[] = ['summary', 'layers', 'review'];
  const defaultPhase = order.find((p) => unlocked[p]) ?? 'review';
  const phase: Step05Phase = parseStep05Phase(rawPhase) ?? defaultPhase;

  const setPhase = useCallback(
    (next: Step05Phase) => {
      if (searchParams.get('pane') === 'worksheet' && searchParams.get('phase') === next) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('pane', 'worksheet');
      params.set('phase', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const hasTheme = theme != null;
  const phaseUnlocked = unlocked[phase];

  // 復元前は動かさない。ロック中の画面（自分らしさ以降など）は、開いているプロセスへ一度だけ戻す。
  // 依存を付けないと、URL が変わる前に同じ replace を繰り返し、画面遷移が終わらなくなる。
  useEffect(() => {
    if (!ready || !hasTheme || phaseUnlocked) return;
    if (rawPhase === defaultPhase) return;
    setPhase(defaultPhase);
  }, [ready, hasTheme, phaseUnlocked, rawPhase, defaultPhase, setPhase]);

  const patch = useCallback(
    (fn: (t: Step05Theme) => Step05Theme) => {
      if (domainId) patchTheme(domainId, fn);
    },
    [domainId, patchTheme]
  );

  const patchSlot = useCallback(
    <K extends AiKey>(id: MandalaDomainId, key: K, fn: (s: Step05Theme['ai'][K]) => Step05Theme['ai'][K]) => {
      patchTheme(id, (t) => ({ ...t, ai: { ...t.ai, [key]: fn(t.ai[key]) } }));
    },
    [patchTheme]
  );

  /* ===== AI（先読み・再試行・Ai更新） ===== */

  const inflight = useRef(new Set<string>());

  const runAi = useCallback(
    async <K extends AiKey>(
      key: K,
      inputKey: string,
      generate: () => Promise<NonNullable<Step05Theme['ai'][K]['data']>>,
      refresh = false
    ) => {
      if (!domainId) return;
      const flight = `${domainId}:${key}`;
      if (inflight.current.has(flight)) return;
      inflight.current.add(flight);
      const id = domainId;
      type Slot = Step05Theme['ai'][K];
      patchSlot(id, key, (s) => ({ ...s, status: 'loading' }) as Slot);
      try {
        const data = await generate();
        patchSlot(
          id,
          key,
          (s) =>
            ({
              ...s,
              status: 'ready',
              data,
              refreshedNotice: !refresh && s.data != null && s.inputKey !== inputKey,
              inputKey,
              refreshCount: refresh ? s.refreshCount + 1 : s.inputKey === inputKey ? s.refreshCount : 0,
            }) as Slot
        );
      } catch {
        patchSlot(id, key, (s) => ({ ...s, status: 'error', inputKey }) as Slot);
      } finally {
        inflight.current.delete(flight);
      }
    },
    [domainId, patchSlot]
  );

  const candidatesKey = ctx && theme ? candidatesInputKey(ctx, theme.targetScore) : null;
  const goalsKey = theme ? goalsInputKey(theme) : null;
  const fitKey = theme ? fitInputKey(theme) : null;
  const currentsKey = theme ? currentsInputKey(theme) : null;

  const runCandidates = useCallback(
    (refresh = false) => {
      if (!ctx || !theme || !candidatesKey) return;
      const variant = refresh ? theme.ai.candidates.refreshCount + 1 : 0;
      void runAi('candidates', candidatesKey, () => generateLayerCandidates(ctx, variant), refresh);
    },
    [candidatesKey, ctx, runAi, theme]
  );
  const runGoals = useCallback(
    (refresh = false) => {
      if (!ctx || !theme || !goalsKey) return;
      const variant = refresh ? theme.ai.goals.refreshCount + 1 : 0;
      void runAi('goals', goalsKey, () => generateGoalStatements(ctx, theme, variant), refresh);
    },
    [ctx, goalsKey, runAi, theme]
  );
  const runFit = useCallback(() => {
    if (!ctx || !theme || !fitKey) return;
    void runAi('fit', fitKey, () => generateFitAdvice(ctx, theme));
  }, [ctx, fitKey, runAi, theme]);
  const runCurrents = useCallback(() => {
    if (!ctx || !theme || !currentsKey) return;
    void runAi('currents', currentsKey, () => generateCurrentDrafts(ctx, theme));
  }, [ctx, currentsKey, runAi, theme]);

  const gapsKey = theme ? gapsInputKey(theme) : null;
  const markersKey = theme ? markersInputKey(theme) : null;
  const milestonesKey = theme ? milestonesInputKey(theme) : null;

  const runGaps = useCallback(() => {
    if (!ctx || !theme || !gapsKey) return;
    void runAi('gaps', gapsKey, () => generateGapDrafts(ctx, theme));
  }, [ctx, gapsKey, runAi, theme]);
  const runMarkers = useCallback(
    (refresh = false) => {
      if (!ctx || !theme || !markersKey) return;
      const variant = refresh ? theme.ai.markers.refreshCount + 1 : 0;
      void runAi('markers', markersKey, () => generateMarkerDrafts(ctx, theme, variant), refresh);
    },
    [ctx, markersKey, runAi, theme]
  );
  const runMilestones = useCallback(
    (refresh = false) => {
      if (!ctx || !theme || !milestonesKey) return;
      void runAi('milestones', milestonesKey, () => generateMilestoneDrafts(ctx, theme), refresh);
    },
    [ctx, milestonesKey, runAi, theme]
  );

  const patchPlan = useCallback(
    (fn: (p: Step05PlanDraft) => Step05PlanDraft) => patch((t) => ({ ...t, plan: fn(t.plan) })),
    [patch]
  );

  const needs = (slot: AiSlot<unknown> | undefined, key: string | null) =>
    slot != null && key != null && slot.status !== 'loading' && slot.inputKey !== key;

  // 期限後（見るだけ）は AI を自動で動かさない
  const aiEnabled = ready && !readOnly;

  // AI-1：Step5 を開いたとき（目指す満足度を変えたら作り直す）
  useEffect(() => {
    if (aiEnabled && needs(theme?.ai.candidates, candidatesKey)) runCandidates();
  });

  // AI-3・AI-4：② を離れたあと（入力中に作り直さない）
  useEffect(() => {
    if (!aiEnabled || !progress.layersReady || phase === 'review' || phase === 'layers') return;
    if (needs(theme?.ai.fit, fitKey)) runFit();
    if (needs(theme?.ai.currents, currentsKey)) runCurrents();
  });

  // AI-5：⑥ を開いたとき（目標・今の自分を変えたら作り直す）
  useEffect(() => {
    if (aiEnabled && progress.completed && phase === 'gap' && needs(theme?.ai.gaps, gapsKey)) runGaps();
  });

  // AI-6：⑦ を開いたとき（重点を変えたら作り直す）
  useEffect(() => {
    if (aiEnabled && planProgress.gapReady && phase === 'markers' && needs(theme?.ai.markers, markersKey)) {
      runMarkers();
    }
  });

  // AI-7：⑧ で期間が決まったとき（しるし・期間を変えたら作り直す）
  useEffect(() => {
    if (!aiEnabled || !planProgress.markersReady || phase !== 'period') return;
    if (periodProblem(theme?.plan.period ?? null) != null) return;
    if (needs(theme?.ai.milestones, milestonesKey)) runMilestones();
  });

  // 満足度のしるしは ⑦ で自動で置き、Step3・前半の値に合わせる
  useEffect(() => {
    if (!ready || readOnly || !ctx || !theme || !planProgress.gapReady) return;
    const sat = satisfactionMarker(theme.plan);
    const baseline = ctx.score != null ? String(ctx.score) : (sat?.baseline ?? '');
    if (sat && sat.baseline === baseline && sat.target === String(theme.targetScore)) return;
    patchPlan((p) => withSatisfactionMarker(p, ctx.score, theme.targetScore, ctx.domainLabel));
  });

  const controls = (key: AiKey, run: (refresh?: boolean) => void, stale?: boolean): AiControls => ({
    retry: () => run(false),
    refresh: () => run(true),
    dismissNotice: () =>
      patch((t) => ({
        ...t,
        ai: { ...t.ai, [key]: { ...t.ai[key], refreshedNotice: false } },
      })),
    stale,
  });

  if (!ready) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step05">
        <p className="seven-steps-worksheet-hint">読み込み中...</p>
      </div>
    );
  }

  if (!ctx || !step4Done) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step05">
        <section className="step04-theme-note step05-locked" role="status">
          <p>Step5 は、Step4 の「こころの深掘り」で、どれか1つの課題の気づきを保存すると始められます。</p>
          <p className="seven-steps-worksheet-hint">右上の「具体例を表示」から、裕子さん・康太さんの例を読み込めます。</p>
          <button
            type="button"
            className="mandala-modal-btn"
            onClick={() => router.push(`${stepUrl(4, 'worksheet')}&phase=deepdive`)}
          >
            Step4 に戻る
          </button>
        </section>
      </div>
    );
  }

  const accessUi = access ? (
    <>
      <AccessNotice
        access={access}
        noticeSeen={accessHook.state?.step05NoticeSeenAt != null}
        onNoticeSeen={accessHook.markNoticeSeen}
        onSubscribe={() => setSubscribeOpen(true)}
        includeIntro={false}
      />
      {subscribeOpen ? (
        <SubscribeModal
          onClose={() => setSubscribeOpen(false)}
          onConfirm={() => {
            accessHook.subscribe();
            setSubscribeOpen(false);
          }}
        />
      ) : null}
    </>
  ) : null;

  if (!theme) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step05">
        {readOnly ? accessUi : <p className="seven-steps-worksheet-hint">準備しています...</p>}
      </div>
    );
  }

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step05">
      <Step05PhaseNav phase={phase} onChange={setPhase} unlocked={unlocked} done={done} />
      {accessUi}

      <div className="step04-context" aria-label="取り組み中のテーマ">
        <div className="step04-context-main">
          <span className="step04-context-label">テーマ</span>
          <span className="step04-context-name">{ctx.domainLabel}</span>
          {phase !== 'layers' ? (
            <span className="step04-context-score">
              満足度 {ctx.score ?? '—'} → 目標 {theme.targetScore}
            </span>
          ) : null}
          <SaveStatusBadge status={saveStatus} />
        </div>
        {phase === 'summary' && formatHaveSummary(theme.goal) ? (
          <p className="step05-context-goal">{formatHaveSummary(theme.goal)}</p>
        ) : null}
      </div>

      <fieldset className="sp-readonly-scope" disabled={readOnly} aria-label={readOnly ? '見るだけ' : undefined}>
        {phase === 'review' ? (
          <Step05ReviewPhase
            ctx={ctx}
            theme={theme}
            onTargetScore={(s) => patch((t) => ({ ...t, targetScore: s }))}
            onConfirm={() => {
              patch((t) => ({
                ...t,
                targetScoreSavedAt: t.targetScoreSavedAt ?? Date.now(),
              }));
              setPhase('layers');
            }}
          />
        ) : null}

        {phase === 'layers' && unlocked.layers ? (
          <Step05LayersPhase
            ctx={ctx}
            theme={theme}
            ready={progress.layersFilled}
            onChange={patch}
            onNext={() => setPhase('summary')}
          />
        ) : null}

        {phase === 'summary' && unlocked.summary ? (
          <Step05SummaryPhase
            ctx={ctx}
            theme={theme}
            goalsAi={controls(
              'goals',
              runGoals,
              theme.ai.goals.inputKey != null && theme.ai.goals.inputKey !== goalsKey
            )}
            onChange={patch}
          />
        ) : null}

        {phase === 'fit' && unlocked.fit ? (
          <Step05FitPhase
            ctx={ctx}
            theme={theme}
            progress={progress}
            onRate={(key, rating) => patch((t) => ({ ...t, fit: { ...t.fit, [key]: rating } }))}
            fitAi={controls('fit', runFit)}
            onBackToLayers={() => setPhase('layers')}
            onNext={() => setPhase('current')}
          />
        ) : null}

        {phase === 'current' && unlocked.current ? (
          <Step05CurrentPhase
            theme={theme}
            score={ctx.score}
            progress={progress}
            onCurrent={(id, text) =>
              patch((t) => ({
                ...t,
                items: t.items.map((i) => (i.id === id ? { ...i, current: text } : i)),
              }))
            }
            currentsAi={controls('currents', runCurrents)}
            onNext={() => setPhase('board')}
          />
        ) : null}

        {phase === 'board' && unlocked.board ? (
          <Step05BoardPhase
            ctx={ctx}
            theme={theme}
            onConfirm={() => {
              patch((t) => ({ ...t, boardConfirmedAt: Date.now() }));
              setPhase('gap');
            }}
            onSecondHalf={() => setPhase('gap')}
          />
        ) : null}

        {phase === 'gap' && unlocked.gap ? (
          <Step05GapPhase
            theme={theme}
            progress={planProgress}
            patchPlan={patchPlan}
            gapsAi={controls('gaps', runGaps)}
            onNext={() => setPhase('markers')}
          />
        ) : null}

        {phase === 'markers' && unlocked.markers ? (
          <Step05MarkersPhase
            theme={theme}
            progress={planProgress}
            patchPlan={patchPlan}
            markersAi={controls('markers', runMarkers)}
            onNext={() => setPhase('period')}
          />
        ) : null}

        {phase === 'period' && unlocked.period ? (
          <Step05PeriodPhase
            theme={theme}
            progress={planProgress}
            patchPlan={patchPlan}
            milestonesAi={controls('milestones', runMilestones)}
            onNext={() => setPhase('risk')}
          />
        ) : null}

        {phase === 'risk' && unlocked.risk ? (
          <Step05RiskPhase ctx={ctx} theme={theme} patchPlan={patchPlan} onNext={() => setPhase('timeline')} />
        ) : null}

        {phase === 'timeline' && unlocked.timeline ? (
          <Step05TimelinePhase
            ctx={ctx}
            theme={theme}
            onConfirm={() => patchPlan((p) => ({ ...p, timelineConfirmedAt: Date.now() }))}
          />
        ) : null}
      </fieldset>
    </div>
  );
}
