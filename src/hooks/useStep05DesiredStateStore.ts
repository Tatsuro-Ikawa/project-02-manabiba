'use client';

import { useCallback, useEffect, useState } from 'react';
import { MANDALA_DOMAINS, type MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import { getLayerOption, type LayerKey, type LayerTagId } from '@/lib/startProgram/step04Constants';
import { emptyAiSlot, type AiSlot } from '@/lib/startProgram/step04DeepDiveConstants';
import {
  FIT_RATINGS,
  STEP05_CURRENT_MAX_CHARS,
  STEP05_GOAL_MAX_CHARS,
  STEP05_PERIOD_MAX_CHARS,
  STEP05_STORAGE_KEY,
  STEP05_TARGET_MAX_CHARS,
  TARGET_SCORES,
  emptyFit,
  emptyStep05Ai,
  emptyStep05Store,
  type CurrentDrafts,
  type FitAdvice,
  type FitKey,
  type FitRating,
  type LayerCandidates,
  type Step05Item,
  type Step05Store,
  type Step05Theme,
  type TargetScore,
} from '@/lib/startProgram/step05Constants';
import {
  MARKER_KINDS,
  STAGES,
  STEP05_GAP_MAX_CHARS,
  STEP05_MARKER_LABEL_MAX_CHARS,
  STEP05_MARKER_VALUE_MAX_CHARS,
  STEP05_MILESTONE_MAX_CHARS,
  STEP05_NOTE_MAX_CHARS,
  emptyPlanDraft,
  isDateKey,
  type GapDrafts,
  type Horizon,
  type MarkerDrafts,
  type MarkerKind,
  type MarkerSuggestion,
  type MilestoneDrafts,
  type StageKind,
  type Step05Marker,
  type Step05Period,
  type Step05PlanDraft,
} from '@/lib/startProgram/step05PlanConstants';

const LAYER_KEYS: LayerKey[] = ['have', 'do', 'be'];
const FIT_KEYS: FitKey[] = ['interest', 'values', 'strength'];

function isDomainId(v: unknown): v is MandalaDomainId {
  return typeof v === 'string' && MANDALA_DOMAINS.some((d) => d.id === v);
}

function clip(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max).join('');
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function savedAt(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

/** 生成中のまま保存された枠は、再訪時に作り直す */
function normalizeSlot<T>(raw: unknown, normalizeData: (d: unknown) => T | null): AiSlot<T> {
  const o = obj(raw);
  if (!raw) return emptyAiSlot<T>();
  const data = o.data == null ? null : normalizeData(o.data);
  const status = o.status === 'ready' && data ? 'ready' : o.status === 'error' ? 'error' : 'idle';
  return {
    status,
    data,
    inputKey: status === 'idle' ? null : typeof o.inputKey === 'string' ? o.inputKey : null,
    refreshCount: typeof o.refreshCount === 'number' ? o.refreshCount : 0,
    refreshedNotice: o.refreshedNotice === true,
  };
}

function normalizeItem(raw: unknown): Step05Item | null {
  const o = obj(raw);
  if (typeof o.id !== 'string' || !LAYER_KEYS.includes(o.layer as LayerKey)) return null;
  const layer = o.layer as LayerKey;
  const tag = o.sourceTagId as LayerTagId;
  return {
    id: o.id,
    layer,
    sourceTagId: typeof tag === 'string' && getLayerOption(tag)?.layer.key === layer ? tag : null,
    reasonId: typeof o.reasonId === 'string' ? o.reasonId : null,
    target: clip(o.target, STEP05_TARGET_MAX_CHARS),
    current: clip(o.current, STEP05_CURRENT_MAX_CHARS),
  };
}

const MARKER_KIND_IDS = MARKER_KINDS.map((k) => k.id);
const STAGE_KINDS = STAGES.map((s) => s.kind);

function strRecord(v: unknown, max: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(obj(v))) if (typeof x === 'string') out[k] = clip(x, max);
  return out;
}

function normalizeMarker(raw: unknown): Step05Marker | null {
  const o = obj(raw);
  if (typeof o.id !== 'string' || !MARKER_KIND_IDS.includes(o.kind as MarkerKind)) return null;
  return {
    id: o.id,
    itemId: typeof o.itemId === 'string' ? o.itemId : null,
    role: o.role === 'response' ? 'response' : 'arrival',
    label: clip(o.label, STEP05_MARKER_LABEL_MAX_CHARS),
    kind: o.kind as MarkerKind,
    unit: clip(o.unit, 8),
    baseline: clip(o.baseline, STEP05_MARKER_VALUE_MAX_CHARS),
    target: clip(o.target, STEP05_MARKER_VALUE_MAX_CHARS),
    cadence: o.cadence === 'weekly' ? 'weekly' : 'monthly',
  };
}

function normalizeMarkerSuggestion(raw: unknown): MarkerSuggestion | null {
  const m = normalizeMarker({ ...obj(raw), id: 'x', itemId: null });
  if (!m) return null;
  return {
    role: m.role,
    label: m.label,
    kind: m.kind,
    unit: m.unit,
    baseline: m.baseline,
    target: m.target,
    cadence: m.cadence,
  };
}

function normalizePeriod(raw: unknown): Step05Period | null {
  const o = obj(raw);
  if (![o.startDate, o.targetDate, o.targetDateLatest, o.expandEndDate].every(isDateKey)) return null;
  const horizon = ['3m', '6m', '1y', 'custom'].includes(o.horizon as string) ? (o.horizon as Horizon) : 'custom';
  return {
    startDate: o.startDate as string,
    horizon,
    targetDate: o.targetDate as string,
    targetDateLatest: o.targetDateLatest as string,
    expandEndDate: o.expandEndDate as string,
  };
}

function stageKind(v: unknown): StageKind | null {
  return STAGE_KINDS.includes(v as StageKind) ? (v as StageKind) : null;
}

function normalizePlan(raw: unknown): Step05PlanDraft {
  const o = obj(raw);
  const empty = emptyPlanDraft();
  const focusRaw = obj(o.focus);
  const stagesRaw = Array.isArray(o.stages) ? o.stages.map(obj) : [];
  return {
    gaps: strRecord(o.gaps, STEP05_GAP_MAX_CHARS),
    focus: {
      have: typeof focusRaw.have === 'string' ? focusRaw.have : null,
      do: typeof focusRaw.do === 'string' ? focusRaw.do : null,
      be: typeof focusRaw.be === 'string' ? focusRaw.be : null,
    },
    markers: (Array.isArray(o.markers) ? o.markers : [])
      .map(normalizeMarker)
      .filter((m): m is Step05Marker => m != null),
    period: normalizePeriod(o.period),
    stages: empty.stages.map((s) => {
      const hit = stagesRaw.find((x) => x.kind === s.kind);
      if (!hit) return s;
      return {
        id: typeof hit.id === 'string' ? hit.id : s.id,
        kind: s.kind,
        milestone: clip(hit.milestone, STEP05_MILESTONE_MAX_CHARS),
        expected: strRecord(hit.expected, STEP05_MARKER_VALUE_MAX_CHARS),
      };
    }),
    busyPeriods: (Array.isArray(o.busyPeriods) ? o.busyPeriods : []).flatMap((x) => {
      const b = obj(x);
      if (typeof b.id !== 'string' || !isDateKey(b.startDate) || !isDateKey(b.endDate)) return [];
      return [{ id: b.id, startDate: b.startDate, endDate: b.endDate, reason: clip(b.reason, STEP05_NOTE_MAX_CHARS) }];
    }),
    bufferWeekPerStage: o.bufferWeekPerStage !== false,
    brakeMarks: (Array.isArray(o.brakeMarks) ? o.brakeMarks : []).flatMap((x) => {
      const b = obj(x);
      if (typeof b.id !== 'string' || typeof b.reasonId !== 'string' || typeof b.scene !== 'string') return [];
      return [
        {
          id: b.id,
          reasonId: b.reasonId,
          scene: b.scene,
          stageKind: stageKind(b.stageKind),
          note: clip(b.note, STEP05_NOTE_MAX_CHARS),
        },
      ];
    }),
    situationMarks: (Array.isArray(o.situationMarks) ? o.situationMarks : []).flatMap((x) => {
      const s = obj(x);
      return typeof s.reasonId === 'string'
        ? [{ reasonId: s.reasonId, note: clip(s.note, STEP05_NOTE_MAX_CHARS) }]
        : [];
    }),
    riskReviewedAt: savedAt(o.riskReviewedAt),
    timelineConfirmedAt: savedAt(o.timelineConfirmedAt),
  };
}

function normalizeMilestoneDrafts(d: unknown): MilestoneDrafts | null {
  const x = obj(d);
  const ms = obj(x.milestones);
  const milestones = {} as MilestoneDrafts['milestones'];
  for (const kind of STAGE_KINDS) {
    const m = obj(ms[kind]);
    milestones[kind] = { text: typeof m.text === 'string' ? m.text : '', expected: strRecord(m.expected, 40) };
  }
  const brakes = (Array.isArray(x.brakes) ? x.brakes : []).flatMap((b) => {
    const o = obj(b);
    if (typeof o.reasonId !== 'string' || typeof o.scene !== 'string') return [];
    return [{ reasonId: o.reasonId, scene: o.scene, stageKind: stageKind(o.stageKind), note: String(o.note ?? '') }];
  });
  return { milestones, brakes };
}

function normalizeTheme(domainId: MandalaDomainId, raw: unknown): Step05Theme {
  const o = obj(raw);
  const fitRaw = obj(o.fit);
  const fit = emptyFit();
  for (const k of FIT_KEYS) {
    if (FIT_RATINGS.some((r) => r.id === fitRaw[k])) fit[k] = fitRaw[k] as FitRating;
  }
  const ai = obj(o.ai);
  return {
    domainId,
    targetScore: TARGET_SCORES.includes(o.targetScore as TargetScore) ? (o.targetScore as TargetScore) : 8,
    targetScoreSavedAt: savedAt(o.targetScoreSavedAt),
    items: (Array.isArray(o.items) ? o.items : []).map(normalizeItem).filter((i): i is Step05Item => i != null),
    goal: {
      statement: clip(obj(o.goal).statement, STEP05_GOAL_MAX_CHARS),
      expressionPeriod: clip(obj(o.goal).expressionPeriod, STEP05_PERIOD_MAX_CHARS),
    },
    fit,
    boardConfirmedAt: savedAt(o.boardConfirmedAt),
    plan: normalizePlan(o.plan),
    ai: {
      gaps: normalizeSlot<GapDrafts>(ai.gaps, (d) => strRecord(d, 200)),
      markers: normalizeSlot<MarkerDrafts>(ai.markers, (d) => {
        const out: MarkerDrafts = {};
        for (const [k, v] of Object.entries(obj(d))) {
          if (Array.isArray(v)) {
            out[k] = v.map(normalizeMarkerSuggestion).filter((m): m is MarkerSuggestion => m != null);
          }
        }
        return out;
      }),
      milestones: normalizeSlot<MilestoneDrafts>(ai.milestones, normalizeMilestoneDrafts),
      candidates: normalizeSlot<LayerCandidates>(ai.candidates, (d) => {
        const x = obj(d);
        return { have: strList(x.have), do: strList(x.do), be: strList(x.be) };
      }),
      goals: normalizeSlot<string[]>(ai.goals, (d) => (Array.isArray(d) ? strList(d) : null)),
      fit: normalizeSlot<FitAdvice>(ai.fit, (d) => {
        const x = obj(d);
        const out = {} as FitAdvice;
        for (const k of FIT_KEYS) {
          const v = obj(x[k]);
          out[k] = {
            comment: typeof v.comment === 'string' ? v.comment : '',
            suggestion: typeof v.suggestion === 'string' ? v.suggestion : '',
          };
        }
        return out;
      }),
      currents: normalizeSlot<CurrentDrafts>(ai.currents, (d) => {
        const out: CurrentDrafts = {};
        for (const [k, v] of Object.entries(obj(d))) if (typeof v === 'string') out[k] = v;
        return out;
      }),
    },
  };
}

function readStore(): Step05Store {
  const empty = emptyStep05Store();
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STEP05_STORAGE_KEY);
    if (!raw) return empty;
    const themesRaw = obj(obj(JSON.parse(raw)).themes);
    const themes: Step05Store['themes'] = {};
    for (const key of Object.keys(themesRaw)) {
      if (isDomainId(key)) themes[key] = normalizeTheme(key, themesRaw[key]);
    }
    return { version: 1, themes };
  } catch {
    return empty;
  }
}

function writeStore(next: Step05Store) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STEP05_STORAGE_KEY, JSON.stringify(next));
}

export function newStep05Theme(domainId: MandalaDomainId, items: Step05Item[]): Step05Theme {
  return {
    domainId,
    targetScore: 8,
    targetScoreSavedAt: null,
    items,
    goal: { statement: '', expressionPeriod: '' },
    fit: emptyFit(),
    boardConfirmedAt: null,
    plan: emptyPlanDraft(),
    ai: emptyStep05Ai(),
  };
}

/** Step5 — localStorage（v1）。Step4 のテーマ（領域）ごとに持つ */
export function useStep05DesiredStateStore() {
  const [store, setStore] = useState<Step05Store>(() => emptyStep05Store());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const ensureTheme = useCallback((domainId: MandalaDomainId, init: () => Step05Theme) => {
    setStore((prev) => {
      if (prev.themes[domainId]) return prev;
      const next = { ...prev, themes: { ...prev.themes, [domainId]: init() } };
      writeStore(next);
      return next;
    });
  }, []);

  /** AI の応答は非同期で戻るため、テーマを明示して更新する */
  const patchTheme = useCallback((domainId: MandalaDomainId, fn: (t: Step05Theme) => Step05Theme) => {
    setStore((prev) => {
      const cur = prev.themes[domainId];
      if (!cur) return prev;
      const nextTheme = fn(cur);
      if (nextTheme === cur) return prev;
      const next = { ...prev, themes: { ...prev.themes, [domainId]: nextTheme } };
      writeStore(next);
      return next;
    });
  }, []);

  return { store, hydrated, ensureTheme, patchTheme };
}

const CLIP_MAX = {
  target: STEP05_TARGET_MAX_CHARS,
  current: STEP05_CURRENT_MAX_CHARS,
  goal: STEP05_GOAL_MAX_CHARS,
  period: STEP05_PERIOD_MAX_CHARS,
  gap: STEP05_GAP_MAX_CHARS,
  markerLabel: STEP05_MARKER_LABEL_MAX_CHARS,
  markerValue: STEP05_MARKER_VALUE_MAX_CHARS,
  milestone: STEP05_MILESTONE_MAX_CHARS,
  note: STEP05_NOTE_MAX_CHARS,
} as const;

export function clipStep05(text: string, kind: keyof typeof CLIP_MAX): string {
  return clip(text, CLIP_MAX[kind]);
}
