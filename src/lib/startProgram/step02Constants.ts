/** Step2 — 興味レーン定数・型（P0 掘り下げ / P1 まとめる） */

import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import type { WishMotivation } from '@/lib/startProgram/wishMotivation';

export type { WishMotivation };
export {
  MOTIVATION_OPTIONS,
  motivationLabel,
  motivationShortLabel,
  isDeepDiveMotivation,
} from '@/lib/startProgram/wishMotivation';

/** Step2 カテゴリ（入口カード） */
export type Step02Lane = 'interest' | 'values' | 'strength';

/** 興味レーン内フェーズ */
export type InterestPhase = 'dig' | 'group' | 'sentence';

/** まとめる内サブステップ */
export type GroupSubStep = 'color' | 'name';

export const STEP02_LANES: {
  id: Step02Lane;
  label: string;
  illustration: string;
  available: boolean;
}[] = [
  {
    id: 'interest',
    label: '興味',
    illustration: '/start-program/seven-steps/step02/illustrations/interest.png',
    available: true,
  },
  {
    id: 'values',
    label: '価値観',
    illustration: '/start-program/seven-steps/step02/illustrations/values.png',
    available: true,
  },
  {
    id: 'strength',
    label: '得意・強み',
    illustration: '/start-program/seven-steps/step02/illustrations/strength.png',
    available: true,
  },
];

export const INTEREST_PHASES: { id: InterestPhase; label: string; available: boolean }[] = [
  { id: 'dig', label: '掘り下げ', available: true },
  { id: 'group', label: 'まとめる', available: true },
  { id: 'sentence', label: '文にする', available: true },
];

export type GroupColorId = 'red' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'other';

export const GROUP_COLORS: {
  id: Exclude<GroupColorId, 'other'>;
  label: string;
  swatch: string;
}[] = [
  { id: 'red', label: '赤', swatch: '#e57373' },
  { id: 'yellow', label: '黄', swatch: '#ffd54f' },
  { id: 'green', label: '緑', swatch: '#81c784' },
  { id: 'cyan', label: '水色', swatch: '#4dd0e1' },
  { id: 'blue', label: '青', swatch: '#64b5f6' },
  { id: 'purple', label: '紫', swatch: '#ba68c8' },
];

export const OTHER_COLOR: { id: 'other'; label: string; swatch: string } = {
  id: 'other',
  label: 'その他',
  swatch: '#bdbdbd',
};

export const INTEREST_PILL_PREVIEW_CHARS = 5;
export const INTEREST_OPTION_MAX_CHARS = 80;
export const INTEREST_GROUP_TITLE_MAX_CHARS = 40;
export const INTEREST_GROUP_COMMENT_MAX_CHARS = 200;
export const INTEREST_SENTENCE_PHRASE_MAX_CHARS = 80;
export const INTEREST_SENTENCE_ACTION_MAX_CHARS = 120;
export const INTEREST_SENTENCE_MAX_GROUPS = 5;
export const INTEREST_DUMMY_PATH = '/start-program/seven-steps/step02/dummy/yuko-persona.json';

/** Step2 確認用ダミー人物一覧 */
export const STEP02_DUMMY_PERSONAS: {
  id: string;
  label: string;
  path: string;
}[] = [
  {
    id: 'yuko',
    label: '裕子さん',
    path: '/start-program/seven-steps/step02/dummy/yuko-persona.json',
  },
  {
    id: 'kota',
    label: '康太さん',
    path: '/start-program/seven-steps/step02/dummy/kota-persona.json',
  },
];

export const STEP02_DUMMY_SOURCE_KEY = 'startProgram.sevenSteps.step02.dummySource';

export function getActiveDummyPath(): string {
  if (typeof window === 'undefined') return INTEREST_DUMMY_PATH;
  try {
    const stored = window.localStorage.getItem(STEP02_DUMMY_SOURCE_KEY);
    if (stored && STEP02_DUMMY_PERSONAS.some((p) => p.path === stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return INTEREST_DUMMY_PATH;
}

export function setActiveDummyPath(path: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STEP02_DUMMY_SOURCE_KEY, path);
}

export const STEP02_INTEREST_STORAGE_KEY = 'startProgram.sevenSteps.step02.interest';

export type InterestOption = {
  id: string;
  wishEntryId: string;
  label: string;
  source: 'ai' | 'manual' | 'dummy';
  selected: boolean;
};

/** wishEntryId → options */
export type InterestOptionsByWish = Record<string, InterestOption[]>;

/** optionId → 色（まとめる①） */
export type InterestTagColors = Record<string, GroupColorId | undefined>;

export type InterestGroup = {
  colorId: GroupColorId;
  title: string;
  comment: string;
};

/** colorId → グループメタ（タイトル・コメント） */
export type InterestGroupsByColor = Partial<Record<GroupColorId, InterestGroup>>;

export type KeySentencePredicate = 'interest' | 'like' | 'custom';

export type KeySentence = {
  groupColorId: GroupColorId;
  interestPhrase: string;
  predicate: KeySentencePredicate;
  customPredicate: string;
  actionPhrase: string;
};

/** colorId → キーセンテンス */
export type KeySentencesByColor = Partial<Record<GroupColorId, KeySentence>>;

export type Step02InterestUiState = {
  lane: Step02Lane | null;
  phase: InterestPhase;
  groupSubStep: GroupSubStep;
  /** モーダルで開いている願望 ID */
  openWishId: string | null;
  /** 色分けで選択中のタグ（optionId） */
  selectedTagIds: string[];
  activeColorId: Exclude<GroupColorId, 'other'> | null;
};

export type Step02InterestStore = {
  optionsByWish: InterestOptionsByWish;
  tagColors: InterestTagColors;
  groups: InterestGroupsByColor;
  sentences: KeySentencesByColor;
  /** 色分けの履歴（元に戻す用・最大 30） */
  colorHistory: InterestTagColors[];
  ui: Step02InterestUiState;
};

export type MandalaWishRef = {
  entryId: string;
  domainId: MandalaDomainId;
  text: string;
  motivation?: WishMotivation;
};

/** まとめる用フラットタグ */
export type InterestTag = {
  id: string;
  wishEntryId: string;
  label: string;
  colorId?: GroupColorId;
};

export type DummyPersonaFile = {
  persona: { name: string; note: string };
  centerGoal: string;
  wishes: {
    id: string;
    domainId: MandalaDomainId;
    text: string;
    motivation: WishMotivation;
    interestOptions?: string[];
    valueOptions?: string[];
    strengthOptions?: string[];
  }[];
  movingEpisodes?: {
    id: string;
    episode: string;
    emotion: string;
    valueOptions?: string[];
  }[];
  defaultValueOptions?: string[];
  praiseEpisodes?: {
    id: string;
    episode: string;
    emotion: string;
    strengthOptions?: string[];
  }[];
  naturalEpisodes?: {
    id: string;
    episode: string;
    emotion: string;
    strengthOptions?: string[];
  }[];
  defaultStrengthOptions?: string[];
};

export function truncatePillLabel(label: string, maxChars = INTEREST_PILL_PREVIEW_CHARS): string {
  const chars = [...label];
  if (chars.length <= maxChars) return label;
  return `${chars.slice(0, maxChars).join('')}…`;
}

export function createInterestOptionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultInterestStore(): Step02InterestStore {
  return {
    optionsByWish: {},
    tagColors: {},
    groups: {},
    sentences: {},
    colorHistory: [],
    ui: {
      lane: null,
      phase: 'dig',
      groupSubStep: 'color',
      openWishId: null,
      selectedTagIds: [],
      activeColorId: null,
    },
  };
}

/** 選択済みピルを横断フラット化 */
export function flattenSelectedTags(
  optionsByWish: InterestOptionsByWish,
  tagColors: InterestTagColors
): InterestTag[] {
  const tags: InterestTag[] = [];
  const seen = new Set<string>();
  for (const options of Object.values(optionsByWish)) {
    for (const opt of options) {
      if (!opt.selected || seen.has(opt.id)) continue;
      seen.add(opt.id);
      tags.push({
        id: opt.id,
        wishEntryId: opt.wishEntryId,
        label: opt.label,
        colorId: tagColors[opt.id],
      });
    }
  }
  return tags;
}

export function countUsedColors(tagColors: InterestTagColors): number {
  const set = new Set<GroupColorId>();
  for (const c of Object.values(tagColors)) {
    if (c && c !== 'other') set.add(c);
  }
  return set.size;
}

export function colorSwatch(colorId: GroupColorId | undefined): string {
  if (!colorId || colorId === 'other') return OTHER_COLOR.swatch;
  return GROUP_COLORS.find((c) => c.id === colorId)?.swatch ?? OTHER_COLOR.swatch;
}

export function colorLabel(colorId: GroupColorId): string {
  if (colorId === 'other') return OTHER_COLOR.label;
  return GROUP_COLORS.find((c) => c.id === colorId)?.label ?? colorId;
}

/** タグ色から使用中のグループ色を順序付きで返す */
export function orderedUsedColorIds(tagColors: InterestTagColors): GroupColorId[] {
  const used = new Set<GroupColorId>();
  for (const c of Object.values(tagColors)) {
    if (c) used.add(c);
  }
  const order: GroupColorId[] = [...GROUP_COLORS.map((c) => c.id), 'other'];
  return order.filter((id) => used.has(id));
}

export function predicateLabel(
  predicate: KeySentencePredicate,
  customPredicate: string
): string {
  if (predicate === 'like') return 'が好きだ';
  if (predicate === 'custom') return customPredicate.trim() || '……';
  return 'に興味がある';
}

export function formatKeySentence(s: KeySentence): string {
  const interest = s.interestPhrase.trim() || '＿＿＿＿';
  const pred = predicateLabel(s.predicate, s.customPredicate);
  const action = s.actionPhrase.trim() || '＿＿＿＿';
  return `私は、${interest}${pred}。だから、${action}のだ。`;
}

export function emptyKeySentence(groupColorId: GroupColorId, title = ''): KeySentence {
  return {
    groupColorId,
    interestPhrase: title,
    predicate: 'interest',
    customPredicate: '',
    actionPhrase: '',
  };
}

/** P1 キーセンテンス述語 */
export const KEY_SENTENCE_PREDICATES = [
  { id: 'interest' as const, label: 'に興味がある' },
  { id: 'like' as const, label: 'が好きだ' },
  { id: 'custom' as const, label: '（自由に書く）' },
];
