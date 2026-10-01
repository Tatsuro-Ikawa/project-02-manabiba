/** Step2 価値観レーン — 定数・型 */

import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import type {
  GroupColorId,
  GroupSubStep,
  InterestGroupsByColor,
  InterestTagColors,
} from '@/lib/startProgram/step02Constants';
import {
  orderedUsedColorIds,
} from '@/lib/startProgram/step02Constants';

export type ValuesPhase = 'dig' | 'group' | 'sentence';

export const VALUES_PHASES: { id: ValuesPhase; label: string; available: boolean }[] = [
  { id: 'dig', label: '掘り下げ', available: true },
  { id: 'group', label: 'まとめる', available: true },
  { id: 'sentence', label: '文にする', available: true },
];

export const VALUES_STORAGE_KEY = 'startProgram.sevenSteps.step02.values';
export const VALUES_DUMMY_PATH = '/start-program/seven-steps/step02/dummy/yuko-persona.json';

export const VALUES_OPTION_MAX_CHARS = 80;
export const VALUES_EPISODE_MAX_CHARS = 200;
export const VALUES_EMOTION_MAX_CHARS = 100;
export const VALUES_EPISODE_MIN_REQUIRED = 1;
export const VALUES_EPISODE_MAX_ROWS = 5;
export const VALUES_PILL_PREVIEW_CHARS = 5;
export const VALUES_SENTENCE_PHRASE_MAX = 80;
export const VALUES_SENTENCE_ACTION_MAX = 120;
export const VALUES_SENTENCE_MAX_GROUPS = 5;

export type ValueOption = {
  id: string;
  /** 願望 or エピソードの ID */
  sourceId: string;
  sourceType: 'wish' | 'episode';
  label: string;
  source: 'ai' | 'manual' | 'dummy';
  selected: boolean;
};

export type MovingEpisode = {
  id: string;
  episode: string;
  emotion: string;
  options: ValueOption[];
};

export type ValuesOptionsByWish = Record<string, ValueOption[]>;

export type ValuesUiState = {
  phase: ValuesPhase;
  groupSubStep: GroupSubStep;
  openWishId: string | null;
  openEpisodeId: string | null;
  selectedTagIds: string[];
  activeColorId: Exclude<GroupColorId, 'other'> | null;
};

export type Step02ValuesStore = {
  optionsByWish: ValuesOptionsByWish;
  episodes: MovingEpisode[];
  tagColors: InterestTagColors;
  groups: InterestGroupsByColor;
  sentences: ValuesSentencesByColor;
  colorHistory: InterestTagColors[];
  ui: ValuesUiState;
};

export type ValueTag = {
  id: string;
  label: string;
  sourceType: 'wish' | 'episode';
  sourceId: string;
  colorId?: GroupColorId;
};

export type ValuesPredicateId = 'cherish' | 'protect' | 'custom';

/** 価値観キーセンテンス述語 */
export const VALUES_KEY_PREDICATES: { id: ValuesPredicateId; label: string }[] = [
  { id: 'cherish', label: 'を大切にしている' },
  { id: 'protect', label: 'を守りたい' },
  { id: 'custom', label: '（自由に書く）' },
];

export type ValuesKeySentence = {
  groupColorId: GroupColorId;
  valuePhrase: string;
  predicate: ValuesPredicateId;
  customPredicate: string;
  actionPhrase: string;
};

export type ValuesSentencesByColor = Partial<Record<GroupColorId, ValuesKeySentence>>;

export function createValueOptionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `vopt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEpisodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyEpisode(): MovingEpisode {
  return {
    id: createEpisodeId(),
    episode: '',
    emotion: '',
    options: [],
  };
}

export function defaultValuesStore(): Step02ValuesStore {
  return {
    optionsByWish: {},
    episodes: [emptyEpisode()],
    tagColors: {},
    groups: {},
    sentences: {},
    colorHistory: [],
    ui: {
      phase: 'dig',
      groupSubStep: 'color',
      openWishId: null,
      openEpisodeId: null,
      selectedTagIds: [],
      activeColorId: null,
    },
  };
}

export function truncateValuePill(label: string, max = VALUES_PILL_PREVIEW_CHARS): string {
  const chars = [...label];
  if (chars.length <= max) return label;
  return `${chars.slice(0, max).join('')}…`;
}

/** 願望＋エピソードの選択済み価値観を横断フラット化 */
export function flattenSelectedValueTags(
  optionsByWish: ValuesOptionsByWish,
  episodes: MovingEpisode[],
  tagColors: InterestTagColors
): ValueTag[] {
  const tags: ValueTag[] = [];
  const seen = new Set<string>();

  for (const [wishId, options] of Object.entries(optionsByWish)) {
    for (const opt of options) {
      if (!opt.selected || seen.has(opt.id)) continue;
      seen.add(opt.id);
      tags.push({
        id: opt.id,
        label: opt.label,
        sourceType: 'wish',
        sourceId: wishId,
        colorId: tagColors[opt.id],
      });
    }
  }

  for (const ep of episodes) {
    for (const opt of ep.options) {
      if (!opt.selected || seen.has(opt.id)) continue;
      seen.add(opt.id);
      tags.push({
        id: opt.id,
        label: opt.label,
        sourceType: 'episode',
        sourceId: ep.id,
        colorId: tagColors[opt.id],
      });
    }
  }

  return tags;
}

export function isEpisodeComplete(ep: MovingEpisode): boolean {
  return (
    ep.episode.trim().length > 0 &&
    ep.emotion.trim().length > 0 &&
    ep.options.some((o) => o.selected)
  );
}

export function countCompleteEpisodes(episodes: MovingEpisode[]): number {
  return episodes.filter(isEpisodeComplete).length;
}

export function emptyValuesSentence(
  groupColorId: GroupColorId,
  title = ''
): ValuesKeySentence {
  return {
    groupColorId,
    valuePhrase: title,
    predicate: 'cherish',
    customPredicate: '',
    actionPhrase: '',
  };
}

export function valuesPredicateLabel(
  predicate: ValuesPredicateId,
  custom: string
): string {
  if (predicate === 'protect') return 'を守りたい';
  if (predicate === 'custom') return custom.trim() || '……';
  return 'を大切にしている';
}

export function formatValuesKeySentence(s: ValuesKeySentence): string {
  const value = s.valuePhrase.trim() || '＿＿＿＿';
  const pred = valuesPredicateLabel(s.predicate, s.customPredicate);
  const action = s.actionPhrase.trim() || '＿＿＿＿';
  return `私は、${value}${pred}。だから、${action}のだ。`;
}

export function ensureValuesSentencesFromGroups(
  tagColors: InterestTagColors,
  groups: InterestGroupsByColor,
  sentences: ValuesSentencesByColor
): ValuesSentencesByColor {
  const next = { ...sentences };
  for (const colorId of orderedUsedColorIds(tagColors)) {
    const title = groups[colorId]?.title?.trim() ?? '';
    const existing = next[colorId];
    if (!existing) {
      next[colorId] = emptyValuesSentence(colorId, title);
    } else if (!existing.valuePhrase.trim() && title) {
      next[colorId] = { ...existing, valuePhrase: title };
    }
  }
  return next;
}

export type { MandalaDomainId, GroupColorId, InterestTagColors };
