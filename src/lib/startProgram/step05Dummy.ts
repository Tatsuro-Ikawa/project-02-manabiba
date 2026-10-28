/** Step5 前半 確認用ダミーデータの読み込み（Step1〜4 は Step3 のダミーを流用） */

import { STORAGE_KEY as STEP01_STORAGE_KEY } from '@/hooks/useMandalaLocalStore';
import { newStep05Theme } from '@/hooks/useStep05DesiredStateStore';
import { STEP03_SATISFACTION_STORAGE_KEY } from '@/lib/startProgram/step03Constants';
import { loadStep03DummyBundle } from '@/lib/startProgram/step03Dummy';
import type { LayerKey, LayerTagId } from '@/lib/startProgram/step04Constants';
import { STEP04_STORAGE_KEY } from '@/lib/startProgram/step04Constants';
import {
  baseLayerCandidates,
  buildCurrentDrafts,
  buildFitAdvice,
} from '@/lib/startProgram/step05Ai';
import {
  STEP05_DUMMY_REFS_KEY,
  STEP05_STORAGE_KEY,
  currentsInputKey,
  emptyFit,
  filledItems,
  fitInputKey,
  answerSlots,
  newItem,
  toHaveContent,
  step05Progress,
  type FitKey,
  type FitRating,
  type Step05DummyRefs,
  type Step05Store,
  type Step05Theme,
  type TargetScore,
} from '@/lib/startProgram/step05Constants';
import {
  buildStep05Context,
  candidatesInputKey,
  readDummyRefs,
  type Step05Context,
} from '@/lib/startProgram/step05Context';
import { buildGapDrafts, buildMarkerDrafts, buildMilestoneDrafts } from '@/lib/startProgram/step05PlanAi';
import {
  createPlanId,
  emptyPlanDraft,
  gapsInputKey,
  markersInputKey,
  milestonesInputKey,
  withSatisfactionMarker,
  type MarkerSuggestion,
  type StageKind,
  type Step05Period,
} from '@/lib/startProgram/step05PlanConstants';

const YUKO_PATH = '/start-program/seven-steps/step05/dummy/yuko-step05.json';

export const STEP05_DUMMY_PERSONAS: { id: string; label: string; path: string; withPlan?: boolean }[] = [
  { id: 'yuko', label: '裕子さん', path: YUKO_PATH },
  { id: 'yuko-plan', label: '裕子さん（後半）', path: YUKO_PATH, withPlan: true },
  { id: 'kota', label: '康太さん', path: '/start-program/seven-steps/step05/dummy/kota-step05.json' },
];

type DummyPlan = {
  focus: Partial<Record<LayerKey, string>>;
  markers: (MarkerSuggestion & { focus: LayerKey })[];
  period: Step05Period;
  /** 段階ごとの期待値（満足度 → markers の順） */
  expected: Partial<Record<StageKind, string[]>>;
  busyPeriods: { startDate: string; endDate: string; reason: string }[];
  /** 保留中の課題の文の書き出し */
  situations: string[];
  riskReviewed: boolean;
};

type Step05DummyFile = {
  persona: { name: string; note: string };
  /** Step1〜4 を読む Step3 ダミー JSON */
  step04Source: string;
  refs: Omit<Step05DummyRefs, 'domainId'>;
  step05: {
    targetScore: TargetScore;
    reviewDone: boolean;
    items: { layer: LayerKey; sourceTagId?: LayerTagId | null; target?: string; current?: string }[];
    goal?: string;
    fit?: Partial<Record<FitKey, FitRating>>;
    boardConfirmed?: boolean;
  };
  plan?: DummyPlan;
};

/** 後半（違い〜振れ幅の手前）まで入った状態を作る */
function applyDummyPlan(theme: Step05Theme, ctx: Step05Context, src: DummyPlan, now: number) {
  const items = filledItems(theme);
  const idOf = (target: string | undefined) => items.find((i) => i.target === target)?.id ?? null;
  const gaps = buildGapDrafts(ctx, theme);
  let plan = emptyPlanDraft();
  plan.gaps = { ...gaps };
  plan.focus = { have: idOf(src.focus.have), do: idOf(src.focus.do), be: idOf(src.focus.be) };
  plan = withSatisfactionMarker(plan, ctx.score, theme.targetScore, ctx.domainLabel);
  plan.markers = [
    ...plan.markers,
    ...src.markers.map(({ focus, ...m }) => ({ ...m, id: createPlanId('m'), itemId: plan.focus[focus] })),
  ];
  plan.period = src.period;
  plan.stages = plan.stages.map((s) => {
    const values = src.expected[s.kind] ?? [];
    return {
      ...s,
      milestone: readDummyRefs().milestones?.[s.kind] ?? '',
      expected: Object.fromEntries(plan.markers.map((m, i) => [m.id, values[i] ?? ''])),
    };
  });
  plan.busyPeriods = src.busyPeriods.map((b) => ({ ...b, id: createPlanId('busy') }));
  plan.situationMarks = ctx.deferred
    .filter((r) => src.situations.some((head) => r.text.startsWith(head)))
    .map((r) => ({ reasonId: r.id, note: '' }));
  plan.riskReviewedAt = src.riskReviewed ? now : null;
  theme.plan = plan;
  theme.ai.gaps = readySlot(gaps, gapsInputKey(theme));
  theme.ai.markers = readySlot(buildMarkerDrafts(ctx, theme), markersInputKey(theme));
  theme.ai.milestones = readySlot(buildMilestoneDrafts(ctx, theme), milestonesInputKey(theme));
}

function readySlot<T>(data: T, inputKey: string) {
  return { status: 'ready' as const, data, inputKey, refreshCount: 0, refreshedNotice: false };
}

/** Step1〜5 をまとめて上書きする。画面の各ストアはマウント時に読むため、呼び出し側で再読み込みする */
export async function loadStep05Dummy(path: string, withPlan = false): Promise<string> {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`dummy fetch failed: ${path}`);
  const file = (await res.json()) as Step05DummyFile;
  const bundle = await loadStep03DummyBundle(file.step04Source);
  const domainId = bundle.step03.focusDomainId;
  const theme4 = domainId ? bundle.step04.themes[domainId] : undefined;
  if (!domainId || !theme4) throw new Error('dummy has no focus domain');

  // Step5 は Step4 完了（気づき保存）が前提のため、自分の言葉まで進んだ深掘りは保存済みにする
  for (const dd of Object.values(theme4.deepDive)) {
    if (dd.working.savedAt != null && dd.insightSavedAt == null) dd.insightSavedAt = Date.now();
  }

  const refs: Step05DummyRefs = { ...file.refs, domainId };
  window.localStorage.setItem(STEP05_DUMMY_REFS_KEY, JSON.stringify(refs));

  const self = {
    interest: refs.self?.interest ?? [],
    values: refs.self?.values ?? [],
    strength: refs.self?.strength ?? [],
  };
  const ctx = buildStep05Context(bundle.step01, bundle.step03, theme4, self);
  const src = file.step05;
  const now = Date.now();
  const theme = newStep05Theme(domainId, []);
  const slots = answerSlots(ctx.reasons);
  const used = new Set<string>();
  theme.items = src.items.flatMap((item) => {
    if (!item.sourceTagId || !item.layer) return [];
    const slot = slots.find(
      (candidate) =>
        candidate.layer === item.layer &&
        candidate.tagId === item.sourceTagId &&
        !used.has(`${candidate.reasonId}:${candidate.tagId}`)
    );
    if (!slot) return [];
    used.add(`${slot.reasonId}:${slot.tagId}`);
    return [{ ...newItem(slot.layer, slot.tagId, item.target ?? '', slot.reasonId), current: item.current ?? '' }];
  });
  theme.targetScore = src.targetScore;
  theme.targetScoreSavedAt = src.reviewDone ? now : null;
  theme.goal = { statement: toHaveContent(src.goal ?? ''), expressionPeriod: '' };
  theme.fit = { ...emptyFit(), ...src.fit };
  theme.ai.candidates = readySlot(baseLayerCandidates(ctx), candidatesInputKey(ctx, theme.targetScore));

  const progress = step05Progress(theme, ctx.reasons);
  if (progress.layersReady) {
    theme.ai.fit = readySlot(buildFitAdvice(ctx, theme), fitInputKey(theme));
    theme.ai.currents = readySlot(buildCurrentDrafts(ctx, theme), currentsInputKey(theme));
  }
  theme.boardConfirmedAt = (src.boardConfirmed || withPlan) && progress.currentReady ? now : null;
  if (withPlan && file.plan && theme.boardConfirmedAt != null) applyDummyPlan(theme, ctx, file.plan, now);

  const step05: Step05Store = { version: 1, themes: { [domainId]: theme } };
  window.localStorage.setItem(STEP01_STORAGE_KEY, JSON.stringify(bundle.step01));
  window.localStorage.setItem(STEP03_SATISFACTION_STORAGE_KEY, JSON.stringify(bundle.step03));
  window.localStorage.setItem(STEP04_STORAGE_KEY, JSON.stringify(bundle.step04));
  window.localStorage.setItem(STEP05_STORAGE_KEY, JSON.stringify(step05));
  return file.persona.name;
}
