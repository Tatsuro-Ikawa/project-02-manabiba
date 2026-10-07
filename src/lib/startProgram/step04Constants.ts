/** Step4 こころのブレーキ探索（選択式パート）— 定数・型 */

import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import type { DeepDiveEntry } from '@/lib/startProgram/step04DeepDiveConstants';

export const STEP04_STORAGE_KEY = 'startProgram.sevenSteps.step04.brakeExplore';

export const STEP04_REASON_MAX_CHARS = 150;
export const STEP04_OTHER_MAX_CHARS = 100;

export const STEP04_REASON_MIN_DEFAULT = 3;
export const STEP04_REASON_MAX_DEFAULT = 10;
/** 設定画面で選べる理由数の範囲（下限・上限とも） */
export const STEP04_REASON_LIMIT_FLOOR = 1;
export const STEP04_REASON_LIMIT_CEIL = 20;

/** 領域（テーマ）選択は「課題の明確化」内のモーダルで行う */
export type Step04Phase = 'reasons' | 'changeability' | 'layers' | 'deepdive';

export const STEP04_PHASES: { id: Step04Phase; label: string }[] = [
  { id: 'reasons', label: '課題の明確化' },
  { id: 'changeability', label: '変えられるか' },
  { id: 'layers', label: '何が変わればよい？' },
  { id: 'deepdive', label: 'こころの深掘り' },
];

export type Changeability = 'can_change' | 'can_influence' | 'hard_now' | 'unsure';

export const CHANGEABILITY_OPTIONS: { id: Changeability; label: string; note: string }[] = [
  { id: 'can_change', label: '自分で変えられそう', note: '次へ進みます' },
  { id: 'can_influence', label: '自分から働きかけることはできそう', note: '次へ進みます' },
  { id: 'hard_now', label: '今の自分では変えるのが難しそう', note: '一旦保留します' },
  { id: 'unsure', label: '分からない', note: '一旦保留します' },
];

export function isActionableChangeability(c: Changeability | null): boolean {
  return c === 'can_change' || c === 'can_influence';
}

export type LayerKey = 'have' | 'do' | 'be';

export type HaveTagId =
  | 'have_resource'
  | 'have_skill'
  | 'have_support'
  | 'have_vitality'
  | 'have_context'
  | 'have_other';

export type DoTagId =
  | 'do_habit'
  | 'do_plan'
  | 'do_relate'
  | 'do_decide'
  | 'do_improve'
  | 'do_other';

export type BeTagId =
  | 'be_self'
  | 'be_relation'
  | 'be_outcome'
  | 'be_compare'
  | 'be_should'
  | 'be_other';

export type LayerTagId = HaveTagId | DoTagId | BeTagId;

export type LayerOption = { id: LayerTagId; label: string; examples: string; isOther?: boolean };

export type LayerDef = {
  key: LayerKey;
  name: string;
  /** 見出しで「名前：説明」として併記する */
  description: string;
  question: string;
  options: LayerOption[];
};

export const STEP04_LAYERS: LayerDef[] = [
  {
    key: 'have',
    name: '持ち方',
    description: '持っている資源',
    question: '今より何かが増えたり、手に入ったりすると、満足度は上がりそうですか？',
    options: [
      { id: 'have_resource', label: 'お金・時間などの使える資源', examples: '収入、貯蓄、時間、設備、物' },
      { id: 'have_skill', label: '知識・能力・経験', examples: '知識、技術、資格、経験' },
      { id: 'have_support', label: '人とのつながり・支援', examples: '家族、仲間、相談相手、人脈' },
      { id: 'have_vitality', label: '健康・体力・心の余裕', examples: '健康、休息、体力、安心感' },
      { id: 'have_context', label: '環境・立場・機会', examples: '職場、住環境、役割、権限、機会' },
      { id: 'have_other', label: 'その他', examples: '自由入力', isOther: true },
    ],
  },
  {
    key: 'do',
    name: 'なし方',
    description: '行動のしかた',
    question: '今の自分の行動ややり方を少し変えるとしたら、どのあたりが関係しそうですか？',
    options: [
      { id: 'do_habit', label: '日々の行動・習慣', examples: '始める、続ける、やめる、休む' },
      { id: 'do_plan', label: '時間・計画・段取り', examples: '優先順位、準備、時間の使い方' },
      { id: 'do_relate', label: '人との関わり・伝え方', examples: '話す、聴く、頼る、任せる、断る' },
      { id: 'do_decide', label: '選択・決断の仕方', examples: '決める、選ぶ、手放す、優先する' },
      { id: 'do_improve', label: '挑戦・工夫・改善の仕方', examples: '試す、工夫する、改善する' },
      { id: 'do_other', label: 'その他', examples: '自由入力', isOther: true },
    ],
  },
  {
    key: 'be',
    name: 'あり方',
    description: 'ものごとの捉え方',
    question:
      '同じ状況でも、自分自身や周りのことを少し違う角度から受け止められたら、感じ方は変わりそうですか？',
    options: [
      { id: 'be_self', label: '自分自身への見方', examples: '自信、自己評価、自分に求める基準' },
      { id: 'be_relation', label: '人との関係の受け止め方', examples: '相手への期待、頼ること、嫌われること' },
      { id: 'be_outcome', label: '成功・失敗・結果の受け止め方', examples: '間違い、失敗、完璧さ、成果' },
      { id: 'be_compare', label: '周囲の評価・比較との向き合い方', examples: '人の目、承認、競争、比較' },
      {
        id: 'be_should',
        label: '不安・変化・「こうあるべき」との付き合い方',
        examples: '不安、未知、責任、べき思考',
      },
      { id: 'be_other', label: 'その他', examples: '自由入力', isOther: true },
    ],
  },
];

export type ReasonOrigin = 'initial' | 'rescue';

export type ReasonEntry = {
  id: string;
  text: string;
  /** initial = プロセス1で挙げた理由 / rescue = ③④だけのときに①②でできることとして追加 */
  origin: ReasonOrigin;
  changeability: Changeability | null;
  tags: Record<LayerKey, LayerTagId[]>;
  otherText: Record<LayerKey, string>;
};

export type Step04Theme = {
  domainId: MandalaDomainId;
  reasons: ReasonEntry[];
  startedAt: number;
  /** 旧「まとめ」の完了日時。完了判定は deepDive の insightSavedAt から導出する */
  completedAt: number | null;
  /** こころの深掘り（reasonId ごと） */
  deepDive: Record<string, DeepDiveEntry>;
};

export type Step04Store = {
  version: 1;
  activeDomainId: MandalaDomainId | null;
  /** 取り組んだ順 */
  themeOrder: MandalaDomainId[];
  themes: Partial<Record<MandalaDomainId, Step04Theme>>;
};

export function emptyStep04Store(): Step04Store {
  return { version: 1, activeDomainId: null, themeOrder: [], themes: {} };
}

export function emptyLayerTags(): Record<LayerKey, LayerTagId[]> {
  return { have: [], do: [], be: [] };
}

export function emptyLayerOtherText(): Record<LayerKey, string> {
  return { have: '', do: '', be: '' };
}

export function createReasonId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isStep04Phase(v: unknown): v is Step04Phase {
  return STEP04_PHASES.some((p) => p.id === v);
}

/** 旧 URL（phase=summary）も読み替える */
export function parseStep04Phase(raw: string | null): Step04Phase | null {
  if (raw === 'summary') return 'deepdive';
  return isStep04Phase(raw) ? raw : null;
}

export function getLayerOption(id: LayerTagId): { layer: LayerDef; option: LayerOption } | undefined {
  for (const layer of STEP04_LAYERS) {
    const option = layer.options.find((o) => o.id === id);
    if (option) return { layer, option };
  }
  return undefined;
}

export function changeabilityLabel(c: Changeability | null): string {
  return CHANGEABILITY_OPTIONS.find((o) => o.id === c)?.label ?? '未回答';
}

/** その他を選んだのに空欄の層は「未記入」とみなす */
function layerHasValidTag(reason: ReasonEntry, key: LayerKey): boolean {
  const tags = reason.tags[key];
  if (tags.length === 0) return false;
  const otherOnly = tags.every((t) => t.endsWith('_other'));
  if (otherOnly) return reason.otherText[key].trim().length > 0;
  return true;
}

/** D3: プロセス3 は Have/Do/Be のどれか1つに記入があれば可 */
export function reasonLayersDone(reason: ReasonEntry): boolean {
  return (['have', 'do', 'be'] as LayerKey[]).some((k) => layerHasValidTag(reason, k));
}

export function reasonHasBe(reason: ReasonEntry): boolean {
  return layerHasValidTag(reason, 'be');
}

/** こころの深掘りの対象：①② かつ「あり方」あり */
export function deepDiveTargets(theme: Step04Theme | undefined): ReasonEntry[] {
  return actionableReasons(theme).filter(reasonHasBe);
}

export function initialReasons(theme: Step04Theme | undefined): ReasonEntry[] {
  return theme?.reasons.filter((r) => r.origin === 'initial' && r.text.trim()) ?? [];
}

export function actionableReasons(theme: Step04Theme | undefined): ReasonEntry[] {
  return theme?.reasons.filter((r) => r.text.trim() && isActionableChangeability(r.changeability)) ?? [];
}

export function deferredReasons(theme: Step04Theme | undefined): ReasonEntry[] {
  return (
    theme?.reasons.filter(
      (r) => r.text.trim() && (r.changeability === 'hard_now' || r.changeability === 'unsure')
    ) ?? []
  );
}

export type Step04Progress = {
  reasonCount: number;
  reasonsReady: boolean;
  allClassified: boolean;
  hasActionable: boolean;
  /** 全理由が③④で、①②が1件もない */
  needsRescue: boolean;
  changeabilityReady: boolean;
  /** ①②の全課題で Have/Do/Be のどれかに記入済み */
  layersFilled: boolean;
  /** ①②の課題のどれかに「あり方」がある（深掘りの対象がある） */
  hasAnyBe: boolean;
  layersReady: boolean;
  /** 深掘り対象のどれかで「この気づきを保存する」済み */
  completed: boolean;
};

export function step04Progress(theme: Step04Theme | undefined, reasonMin: number): Step04Progress {
  const initial = initialReasons(theme);
  const all = theme?.reasons.filter((r) => r.text.trim()) ?? [];
  const reasonsReady = initial.length >= reasonMin;
  const allClassified = all.length > 0 && all.every((r) => r.changeability != null);
  const actionable = actionableReasons(theme);
  const hasActionable = actionable.length > 0;
  const changeabilityReady = reasonsReady && allClassified && hasActionable;
  const layersFilled = changeabilityReady && actionable.every(reasonLayersDone);
  const targets = deepDiveTargets(theme);
  const hasAnyBe = targets.length > 0;
  return {
    reasonCount: initial.length,
    reasonsReady,
    allClassified,
    hasActionable,
    needsRescue: reasonsReady && allClassified && !hasActionable,
    changeabilityReady,
    layersFilled,
    hasAnyBe,
    layersReady: layersFilled && hasAnyBe,
    completed: targets.some((r) => theme?.deepDive[r.id]?.insightSavedAt != null),
  };
}
