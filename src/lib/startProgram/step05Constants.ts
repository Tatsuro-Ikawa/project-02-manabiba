/** Step5 前半（なりたい自分と現在の姿）— 定数・型 */

import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import { getLayerOption, type LayerKey, type LayerTagId } from '@/lib/startProgram/step04Constants';
import { emptyAiSlot, type AiSlot } from '@/lib/startProgram/step04DeepDiveConstants';
import type {
  GapDrafts,
  MarkerDrafts,
  MarkerSuggestion,
  MilestoneDrafts,
  StageKind,
  Step05PlanDraft,
} from '@/lib/startProgram/step05PlanConstants';

export const STEP05_STORAGE_KEY = 'startProgram.sevenSteps.step05.desiredState';
/** ダミー読み込み時だけ使う参照（Step2 の文の代わり・ダミー AI の候補） */
export const STEP05_DUMMY_REFS_KEY = 'startProgram.sevenSteps.step05.dummyRefs';

export const STEP05_ITEM_MAX = 5;
export const STEP05_TARGET_MAX_CHARS = 80;
export const STEP05_CURRENT_MAX_CHARS = 100;
export const STEP05_GOAL_MAX_CHARS = 60;
/** 表現時期。西暦・元号、年月・日・「年末」などを自由に書く */
export const STEP05_PERIOD_MAX_CHARS = 40;
export const STEP05_REFRESH_MAX = 3;

export type Step05FirstPhase = 'review' | 'layers' | 'summary' | 'fit' | 'current' | 'board';
export type Step05SecondPhase = 'gap' | 'markers' | 'period' | 'risk' | 'timeline';
export type Step05Phase = Step05FirstPhase | Step05SecondPhase;
export type Step05Half = 'first' | 'second';

/** 今回の Step5 で使うプロセス。自分らしさ以降と詳細計画は次の開発 */
export const STEP05_NAV_PHASES: { id: Step05FirstPhase; label: string }[] = [
  { id: 'review', label: '満足度設定' },
  { id: 'layers', label: '目標を描く' },
  { id: 'summary', label: '持ち方をまとめる' },
];

export const STEP05_FIRST_PHASES: { id: Step05FirstPhase; label: string }[] = [
  ...STEP05_NAV_PHASES,
  { id: 'fit', label: '自分らしさ' },
  { id: 'current', label: '現在の姿' },
  { id: 'board', label: '見える化' },
];

export const STEP05_SECOND_PHASES: { id: Step05SecondPhase; label: string }[] = [
  { id: 'gap', label: '違いを見る' },
  { id: 'markers', label: '到達のしるし' },
  { id: 'period', label: 'いつまでに' },
  { id: 'risk', label: '振れ幅' },
  { id: 'timeline', label: '道のり' },
];

export const STEP05_PHASES: { id: Step05Phase; label: string }[] = [...STEP05_FIRST_PHASES, ...STEP05_SECOND_PHASES];

export function parseStep05Phase(raw: string | null): Step05Phase | null {
  return STEP05_PHASES.some((p) => p.id === raw) ? (raw as Step05Phase) : null;
}

export function halfOf(phase: Step05Phase): Step05Half {
  return STEP05_SECOND_PHASES.some((p) => p.id === phase) ? 'second' : 'first';
}

export type TargetScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const TARGET_SCORES: TargetScore[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** 目指す満足度は、現状より上かつ 10 まで */
export function targetScoresAbove(current: number | null): TargetScore[] {
  const floor = current ?? 0;
  return TARGET_SCORES.filter((score) => score > floor);
}

export type Step05LayerDef = {
  key: LayerKey;
  name: string;
  /** 構想図の表記 */
  sub: string;
  question: string;
  placeholder: string;
};

export const STEP05_LAYERS: Step05LayerDef[] = [
  {
    key: 'have',
    name: '持ち方',
    sub: '結果',
    question: '目標を達成したとき、あなたは何を持っていますか？（資源・知識・つながり・環境）',
    placeholder: '例：パン作りの販売経験と、地域の常連さんがいる',
  },
  {
    key: 'do',
    name: 'なし方',
    sub: '行動',
    question: 'そのとき、日々どんなふうに行動していますか？',
    placeholder: '例：月2回、マルシェに出店している',
  },
  {
    key: 'be',
    name: 'あり方',
    sub: '自分らしさ',
    question: 'そのとき、ものごとをどう捉えていますか？',
    placeholder: '例：「失敗しても試してみればいい」と思えている',
  },
];

export function getStep05Layer(key: LayerKey): Step05LayerDef {
  return STEP05_LAYERS.find((l) => l.key === key) ?? STEP05_LAYERS[0];
}

/** D4: Step4 のタグから作る「項目の入口」の問い */
export const ENTRY_QUESTIONS: Record<LayerTagId, string> = {
  have_resource: 'お金・時間などの使える資源はどのくらいありますか？',
  have_skill: 'どんな知識・能力・経験を持っていますか？',
  have_support: 'どのような人とのつながり、どのような支援を受けていますか？',
  have_vitality: '心と体は、どんな状態ですか？',
  have_context: 'どんな環境・立場・機会を持っていますか？',
  have_other: '他に、何を持っていますか？',
  do_habit: '日々、どんな行動や習慣を続けていますか？',
  do_plan: '時間や段取りを、どのように組んでいますか？',
  do_relate: '人とどのように関わり、伝えていますか？',
  do_decide: 'どのように選び、決めていますか？',
  do_improve: 'どんな挑戦や工夫をしていますか？',
  do_other: '他に、どんなふうに行動していますか？',
  be_self: '自分自身のことを、どう見ていますか？',
  be_relation: '人との関係を、どう受け止めていますか？',
  be_outcome: 'うまくいかないことや失敗を、どう受け止めていますか？',
  be_compare: '周りの評価や比較と、どう向き合っていますか？',
  be_should: '不安や「こうあるべき」と、どう付き合っていますか？',
  be_other: '他に、ものごとをどう捉えていますか？',
};

export const FREE_ENTRY_QUESTION: Record<LayerKey, string> = {
  have: 'ほかに持っているもの',
  do: 'ほかの行動',
  be: 'ほかの捉え方',
};

export type FitKey = 'interest' | 'values' | 'strength';
export type FitRating = 'strong' | 'some' | 'weak';

export const FIT_QUESTIONS: { key: FitKey; label: string; question: string }[] = [
  { key: 'interest', label: '興味', question: 'この目標に、あなたの興味・関心は入っていますか？' },
  { key: 'values', label: '価値観', question: 'この目標に、あなたの価値観は反映されていますか？' },
  { key: 'strength', label: '強み', question: 'この目標で、あなたの強みは活かされていますか？' },
];

export const FIT_RATINGS: { id: FitRating; mark: string; label: string }[] = [
  { id: 'strong', mark: '◎', label: 'とても' },
  { id: 'some', mark: '○', label: 'ある程度' },
  { id: 'weak', mark: '△', label: 'あまり' },
];

export function fitMark(r: FitRating | null): string {
  return FIT_RATINGS.find((x) => x.id === r)?.mark ?? '—';
}

export type Step05Item = {
  id: string;
  layer: LayerKey;
  /** 課題ごとの目標。未設定の古い項目はまとめの対象にしない */
  reasonId: string | null;
  /** Step4 のタグから作った入口なら、そのタグ ID */
  sourceTagId: LayerTagId | null;
  /** 目標の状態 */
  target: string;
  /** 今の自分 */
  current: string;
};

export type LayerCandidates = Record<LayerKey, string[]>;
export type FitAdvice = Record<FitKey, { comment: string; suggestion: string }>;
/** itemId → 今の自分の下書き */
export type CurrentDrafts = Record<string, string>;

/** Step2 が未記入のときの自分らしさの文と、ダミー AI の候補（ペルソナ用） */
export type Step05DummyRefs = {
  self?: Partial<Record<FitKey, string[]>>;
  domainId?: MandalaDomainId;
  candidates?: Partial<LayerCandidates>;
  goals?: string[];
  /** 後半：目標の項目の文 → 違い */
  gaps?: Record<string, string>;
  /** 後半：方向ごとのしるしの候補 */
  markers?: Partial<Record<LayerKey, MarkerSuggestion[]>>;
  /** 後半：節目の姿 */
  milestones?: Partial<Record<StageKind, string>>;
  /** 後半：Step4 の場面 → ブレーキが出そうな節目 */
  brakes?: Record<string, { stageKind: StageKind; note: string }>;
};

export type Step05Theme = {
  domainId: MandalaDomainId;
  targetScore: TargetScore;
  /** ① 完了 */
  targetScoreSavedAt: number | null;
  items: Step05Item[];
  goal: { statement: string; expressionPeriod: string };
  fit: Record<FitKey, FitRating | null>;
  /** 前半完了 */
  boardConfirmedAt: number | null;
  /** 後半の計画の下書き（Step7 完了時に plans へ写す） */
  plan: Step05PlanDraft;
  ai: {
    /** AI-5 違いの下書き */
    gaps: AiSlot<GapDrafts>;
    /** AI-6 しるしの候補 */
    markers: AiSlot<MarkerDrafts>;
    /** AI-7 節目の姿とブレーキの目印 */
    milestones: AiSlot<MilestoneDrafts>;
    /** AI-1 3方向の候補 */
    candidates: AiSlot<LayerCandidates>;
    /** AI-2 目標の一文 */
    goals: AiSlot<string[]>;
    /** AI-3 自分らしさ診断 */
    fit: AiSlot<FitAdvice>;
    /** AI-4 現在の姿の下書き */
    currents: AiSlot<CurrentDrafts>;
  };
};

export type Step05Store = {
  version: 1;
  themes: Partial<Record<MandalaDomainId, Step05Theme>>;
};

/** 「○○な私」を外し、下段に置く内容にする */
export function toHaveContent(line: string): string {
  return line
    .trim()
    .replace(/[。．.]+$/g, '')
    .replace(/(?:な)?私$/g, '')
    .replace(/[、\s]+$/g, '')
    .trim();
}

/** まとめと実現時期がそろったときだけ、「私は、期日までに、／内容」 */
export function formatHaveSummary(goal: { statement: string; expressionPeriod: string }): string {
  const when = goal.expressionPeriod.trim();
  const what = toHaveContent(goal.statement);
  if (!when || !what) return '';
  return `私は、${when}までに、\n　${what}`;
}

export function emptyStep05Store(): Step05Store {
  return { version: 1, themes: {} };
}

export function emptyFit(): Record<FitKey, FitRating | null> {
  return { interest: null, values: null, strength: null };
}

export function emptyStep05Ai(): Step05Theme['ai'] {
  return {
    candidates: emptyAiSlot(),
    goals: emptyAiSlot(),
    fit: emptyAiSlot(),
    currents: emptyAiSlot(),
    gaps: emptyAiSlot(),
    markers: emptyAiSlot(),
    milestones: emptyAiSlot(),
  };
}

export function createStep05ItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `i-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newItem(
  layer: LayerKey,
  sourceTagId: LayerTagId | null = null,
  target = '',
  reasonId: string | null = null
): Step05Item {
  return { id: createStep05ItemId(), layer, reasonId, sourceTagId, target, current: '' };
}

export type AnswerSlot = {
  reasonId: string;
  reasonText: string;
  layer: LayerKey;
  tagId: LayerTagId;
  label: string;
};

type ReasonTags = { id: string; text: string; tags: Record<LayerKey, LayerTagId[]> };

/** Step4 の課題 × その課題で選んだタグ。方向を省略すると全方向 */
export function answerSlots(reasons: ReasonTags[], layer?: LayerKey): AnswerSlot[] {
  const layers = layer ? STEP05_LAYERS.filter((l) => l.key === layer) : STEP05_LAYERS;
  return layers.flatMap((l) =>
    reasons.flatMap((reason) =>
      reason.tags[l.key].map((tagId) => ({
        reasonId: reason.id,
        reasonText: reason.text,
        layer: l.key,
        tagId,
        label: getLayerOption(tagId)?.option.label ?? tagId,
      }))
    )
  );
}

export function answerOf(theme: Step05Theme, reasonId: string, tagId: LayerTagId): Step05Item | undefined {
  return theme.items.find((item) => item.reasonId === reasonId && item.sourceTagId === tagId);
}

export function withAnswer(theme: Step05Theme, slot: AnswerSlot, target: string): Step05Theme {
  const hit = answerOf(theme, slot.reasonId, slot.tagId);
  if (hit) {
    return { ...theme, items: theme.items.map((item) => (item.id === hit.id ? { ...item, target } : item)) };
  }
  return { ...theme, items: [...theme.items, newItem(slot.layer, slot.tagId, target, slot.reasonId)] };
}

export function itemsOf(theme: Step05Theme, layer: LayerKey): Step05Item[] {
  return theme.items.filter((i) => i.layer === layer);
}

export function filledItems(theme: Step05Theme): Step05Item[] {
  return theme.items.filter((i) => i.target.trim());
}

export type Step05Progress = {
  reviewDone: boolean;
  /** 持ち方の欄がすべて埋まっている。なし方・あり方は次のステップ */
  layersFilled: boolean;
  layersReady: boolean;
  fitReady: boolean;
  hasWeakFit: boolean;
  currentReady: boolean;
  completed: boolean;
};

export function step05Progress(theme: Step05Theme | undefined, reasons: ReasonTags[] = []): Step05Progress {
  if (!theme) {
    return {
      reviewDone: false,
      layersFilled: false,
      layersReady: false,
      fitReady: false,
      hasWeakFit: false,
      currentReady: false,
      completed: false,
    };
  }
  const slots = answerSlots(reasons, 'have');
  const reviewDone = theme.targetScoreSavedAt != null;
  const layersFilled =
    slots.length > 0 && slots.every((slot) => (answerOf(theme, slot.reasonId, slot.tagId)?.target.trim() ?? '') !== '');
  const layersReady =
    reviewDone && layersFilled && theme.goal.statement.trim().length > 0 && theme.goal.expressionPeriod.trim().length > 0;
  const fitValues = Object.values(theme.fit);
  const fitReady = layersReady && fitValues.every((v) => v != null);
  const filled = filledItems(theme);
  const currentReady = fitReady && filled.length > 0 && filled.every((i) => i.current.trim());
  return {
    reviewDone,
    layersFilled,
    layersReady,
    fitReady,
    hasWeakFit: fitValues.includes('weak'),
    currentReady,
    completed: currentReady && theme.boardConfirmedAt != null,
  };
}

/* ===== AI の入力キー（前段が変わったら作り直す） ===== */

export function goalsInputKey(theme: Step05Theme): string {
  return JSON.stringify(filledItems(theme).map((i) => [i.layer, i.target.trim()]));
}

export function fitInputKey(theme: Step05Theme): string {
  return JSON.stringify([theme.goal.statement.trim(), goalsInputKey(theme)]);
}

export function currentsInputKey(theme: Step05Theme): string {
  return JSON.stringify(filledItems(theme).map((i) => [i.id, i.target.trim()]));
}
