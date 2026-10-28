/** Step5 後半（いつまでに・どの程度・道のり）— 定数・型・日付（12 §4〜§8） */

import type { LayerKey } from '@/lib/startProgram/step04Constants';
import { STEP05_LAYERS, filledItems, type Step05Theme } from '@/lib/startProgram/step05Constants';

export const STEP05_GAP_MAX_CHARS = 80;
export const STEP05_MARKER_LABEL_MAX_CHARS = 40;
export const STEP05_MARKER_VALUE_MAX_CHARS = 40;
export const STEP05_MILESTONE_MAX_CHARS = 80;
export const STEP05_NOTE_MAX_CHARS = 60;
/** しるしは満足度を含めて最大 5 個（D13） */
export const STEP05_MARKER_MAX = 5;
/** なじむ は 4 週固定（D14） */
export const SETTLE_DAYS = 28;
/** 広げる・根づかせる の最短日数 */
export const STAGE_MIN_DAYS = 7;

/* ===== しるし ===== */

export type MarkerKind = 'count' | 'scale10' | 'yesno' | 'words';
export type MarkerRole = 'arrival' | 'response';
export type MarkerCadence = 'weekly' | 'monthly';

export const MARKER_KINDS: { id: MarkerKind; label: string; hint: string }[] = [
  { id: 'count', label: '回数', hint: '例：月 2 回' },
  { id: 'scale10', label: '10段階', hint: '自分でつける点数' },
  { id: 'yesno', label: 'できた・まだ', hint: '' },
  { id: 'words', label: 'ことば', hint: '例：「家族に頼めた」と言える' },
];

export const MARKER_ROLES: { id: MarkerRole; label: string }[] = [
  { id: 'arrival', label: '到達のしるし' },
  { id: 'response', label: '手応えのしるし' },
];

export const MARKER_CADENCES: { id: MarkerCadence; label: string }[] = [
  { id: 'weekly', label: '毎週' },
  { id: 'monthly', label: '毎月' },
];

export type Step05Marker = {
  id: string;
  /** 重点の項目。全体の満足度は null */
  itemId: string | null;
  role: MarkerRole;
  label: string;
  kind: MarkerKind;
  /** 回数の単位（回・日・時間 など） */
  unit: string;
  /** 今の値。yesno は 'yes' | 'no'、words は文 */
  baseline: string;
  target: string;
  cadence: MarkerCadence;
};

export type MarkerSuggestion = Omit<Step05Marker, 'id' | 'itemId'>;

export function markerValueLabel(m: Pick<Step05Marker, 'kind' | 'unit'>, value: string): string {
  const v = value.trim();
  if (!v) return '—';
  if (m.kind === 'yesno') return v === 'yes' ? 'できた' : 'まだ';
  if (m.kind === 'count') return `${v}${m.unit || '回'}`;
  return v;
}

export function markerComplete(m: Step05Marker): boolean {
  return m.label.trim().length > 0 && m.baseline.trim().length > 0 && m.target.trim().length > 0;
}

/* ===== 段階 ===== */

export type StageKind = 'settle' | 'expand' | 'root';

export const STAGES: { kind: StageKind; name: string; aim: string }[] = [
  { kind: 'settle', name: 'なじむ', aim: '今の力を知る「ためし期間」。小さく、続けられる量で' },
  { kind: 'expand', name: '広げる', aim: '量や質を少しずつ上げる' },
  { kind: 'root', name: '根づかせる', aim: '安定して続け、到達のしるしに届く' },
];

export function stageName(kind: StageKind | null): string {
  return STAGES.find((s) => s.kind === kind)?.name ?? '未定';
}

export type Step05Stage = {
  id: string;
  kind: StageKind;
  /** 節目の姿 */
  milestone: string;
  /** markerId → 節目での期待値 */
  expected: Record<string, string>;
};

/* ===== いつまでに ===== */

export type Horizon = '3m' | '6m' | '1y' | 'custom';

export const HORIZONS: { id: Exclude<Horizon, 'custom'>; label: string; months: number }[] = [
  { id: '3m', label: '3か月', months: 3 },
  { id: '6m', label: '6か月', months: 6 },
  { id: '1y', label: '1年', months: 12 },
];

/** 日付はすべて YYYY-MM-DD（JST） */
export type DateKey = string;

export type Step05Period = {
  startDate: DateKey;
  horizon: Horizon;
  /** 達成時期（標準） */
  targetDate: DateKey;
  /** 幅の最長 */
  targetDateLatest: DateKey;
  /** 広げる の終わり（根づかせる の前日） */
  expandEndDate: DateKey;
};

/* ===== 振れ幅 ===== */

export type BusyPeriod = { id: string; startDate: DateKey; endDate: DateKey; reason: string };
export type BrakeMark = { id: string; reasonId: string; scene: string; stageKind: StageKind | null; note: string };
export type SituationMark = { reasonId: string; note: string };

/* ===== AI ===== */

/** itemId → 違いの下書き */
export type GapDrafts = Record<string, string>;
/** 重点の itemId → しるしの候補 */
export type MarkerDrafts = Record<string, MarkerSuggestion[]>;
export type MilestoneDrafts = {
  milestones: Record<StageKind, { text: string; expected: Record<string, string> }>;
  brakes: Omit<BrakeMark, 'id'>[];
};

/* ===== 下書き全体 ===== */

export type Step05PlanDraft = {
  /** itemId → 違い */
  gaps: Record<string, string>;
  /** 方向ごとの重点（D12：各方向 1 つ） */
  focus: Record<LayerKey, string | null>;
  markers: Step05Marker[];
  period: Step05Period | null;
  stages: Step05Stage[];
  busyPeriods: BusyPeriod[];
  bufferWeekPerStage: boolean;
  brakeMarks: BrakeMark[];
  situationMarks: SituationMark[];
  riskReviewedAt: number | null;
  timelineConfirmedAt: number | null;
};

export function createPlanId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyStages(): Step05Stage[] {
  return STAGES.map((s) => ({ id: createPlanId('s'), kind: s.kind, milestone: '', expected: {} }));
}

export function emptyPlanDraft(): Step05PlanDraft {
  return {
    gaps: {},
    focus: { have: null, do: null, be: null },
    markers: [],
    period: null,
    stages: emptyStages(),
    busyPeriods: [],
    bufferWeekPerStage: true,
    brakeMarks: [],
    situationMarks: [],
    riskReviewedAt: null,
    timelineConfirmedAt: null,
  };
}

export function stageOf(plan: Step05PlanDraft, kind: StageKind): Step05Stage {
  return plan.stages.find((s) => s.kind === kind) ?? { id: kind, kind, milestone: '', expected: {} };
}

export function satisfactionMarker(plan: Step05PlanDraft): Step05Marker | undefined {
  return plan.markers.find((m) => m.itemId == null);
}

/** 満足度のしるしを置く（今・目指す値は Step3・前半の値に合わせ直す） */
export function withSatisfactionMarker(
  plan: Step05PlanDraft,
  score: number | null,
  targetScore: number,
  domainLabel: string
) {
  const current = satisfactionMarker(plan);
  const base: Step05Marker = {
    id: current?.id ?? createPlanId('m'),
    itemId: null,
    role: 'arrival',
    label: `${domainLabel}の満足度`,
    kind: 'scale10',
    unit: '',
    baseline: score != null ? String(score) : (current?.baseline ?? ''),
    target: String(targetScore),
    cadence: 'monthly',
  };
  const others = plan.markers.filter((m) => m.itemId != null);
  return { ...plan, markers: [base, ...others] };
}

/* ===== 日付（JST の YYYY-MM-DD を UTC の暦として計算） ===== */

const toDate = (key: DateKey) => new Date(`${key}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);

export function isDateKey(v: unknown): v is DateKey {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toDate(v).getTime());
}

export function todayKey(now = Date.now()): DateKey {
  return toKey(new Date(now + 9 * 3_600_000));
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = toDate(key);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toKey(d);
}

export function diffDays(from: DateKey, to: DateKey): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** 翌週の初日（月曜はじまり。利用者設定の反映は本実装で） */
export function nextWeekStart(from: DateKey = todayKey()): DateKey {
  const dow = toDate(from).getUTCDay();
  return addDays(from, (8 - dow) % 7 || 7);
}

export function formatMD(key: DateKey): string {
  const d = toDate(key);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function formatYMD(key: DateKey): string {
  const d = toDate(key);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

/** 達成時期を選んだときの既定値（幅は期間の 3 割、広げる：根づかせる は 6:4） */
export function periodFromHorizon(startDate: DateKey, months: number, horizon: Horizon): Step05Period {
  const targetDate = addDays(addMonths(startDate, months), -1);
  return withDefaults({ startDate, horizon, targetDate });
}

export function withDefaults(p: Pick<Step05Period, 'startDate' | 'horizon' | 'targetDate'>): Step05Period {
  const total = Math.max(1, diffDays(p.startDate, p.targetDate));
  const settleEnd = addDays(p.startDate, SETTLE_DAYS - 1);
  const rest = Math.max(0, diffDays(settleEnd, p.targetDate));
  return {
    ...p,
    targetDateLatest: addDays(p.targetDate, Math.round(total * 0.3)),
    expandEndDate: addDays(settleEnd, Math.max(STAGE_MIN_DAYS, Math.round(rest * 0.6))),
  };
}

export type StageRange = { start: DateKey; end: DateKey };

export function stageRanges(p: Step05Period): Record<StageKind, StageRange> {
  const settleEnd = addDays(p.startDate, SETTLE_DAYS - 1);
  return {
    settle: { start: p.startDate, end: settleEnd },
    expand: { start: addDays(settleEnd, 1), end: p.expandEndDate },
    root: { start: addDays(p.expandEndDate, 1), end: p.targetDate },
  };
}

/** 期間の入力の問題点（なければ null） */
export function periodProblem(p: Step05Period | null): string | null {
  if (!p) return '開始日と達成時期を決めてください';
  const settleEnd = addDays(p.startDate, SETTLE_DAYS - 1);
  if (diffDays(settleEnd, p.targetDate) < STAGE_MIN_DAYS * 2) {
    return `達成時期は、なじむ（4 週）のあとに少なくとも ${STAGE_MIN_DAYS * 2} 日ある日にしてください`;
  }
  if (
    diffDays(settleEnd, p.expandEndDate) < STAGE_MIN_DAYS ||
    diffDays(p.expandEndDate, p.targetDate) < STAGE_MIN_DAYS
  ) {
    return `広げる・根づかせる は、それぞれ ${STAGE_MIN_DAYS} 日以上にしてください`;
  }
  if (diffDays(p.targetDate, p.targetDateLatest) < 0) return '幅の最長は、達成時期より後の日にしてください';
  return null;
}

/* ===== 進み具合 ===== */

export type Step05PlanProgress = {
  gapReady: boolean;
  markersReady: boolean;
  periodReady: boolean;
  riskReady: boolean;
  completed: boolean;
};

export function focusItemIds(theme: Step05Theme): string[] {
  const filled = filledItems(theme);
  return STEP05_LAYERS.map((l) => theme.plan.focus[l.key]).filter(
    (id): id is string => id != null && filled.some((i) => i.id === id)
  );
}

export function step05PlanProgress(theme: Step05Theme | undefined, firstHalfDone: boolean): Step05PlanProgress {
  const none = { gapReady: false, markersReady: false, periodReady: false, riskReady: false, completed: false };
  if (!theme || !firstHalfDone) return none;
  const plan = theme.plan;
  const filled = filledItems(theme);
  const focusIds = focusItemIds(theme);
  const gapReady =
    filled.every((i) => (plan.gaps[i.id] ?? '').trim().length > 0) && focusIds.length === STEP05_LAYERS.length;
  const markersReady =
    gapReady &&
    satisfactionMarker(plan) != null &&
    focusIds.every((id) => plan.markers.some((m) => m.itemId === id)) &&
    plan.markers.every(markerComplete);
  const periodReady =
    markersReady && periodProblem(plan.period) == null && plan.stages.every((s) => s.milestone.trim().length > 0);
  const riskReady = periodReady && plan.riskReviewedAt != null;
  return { gapReady, markersReady, periodReady, riskReady, completed: riskReady && plan.timelineConfirmedAt != null };
}

/* ===== AI の入力キー ===== */

export function gapsInputKey(theme: Step05Theme): string {
  return JSON.stringify(filledItems(theme).map((i) => [i.id, i.target.trim(), i.current.trim()]));
}

export function markersInputKey(theme: Step05Theme): string {
  const filled = filledItems(theme);
  return JSON.stringify([
    theme.targetScore,
    focusItemIds(theme).map((id) => {
      const item = filled.find((i) => i.id === id);
      return [id, item?.target.trim(), (theme.plan.gaps[id] ?? '').trim()];
    }),
  ]);
}

export function milestonesInputKey(theme: Step05Theme): string {
  const p = theme.plan.period;
  return JSON.stringify([
    theme.goal.statement.trim(),
    p ? [p.startDate, p.expandEndDate, p.targetDate] : null,
    theme.plan.markers.map((m) => [m.id, m.label.trim(), m.kind, m.baseline.trim(), m.target.trim()]),
  ]);
}
