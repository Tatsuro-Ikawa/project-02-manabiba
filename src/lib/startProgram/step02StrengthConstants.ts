/** Step2 得意・強みレーン — 定数・型 */

import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import type {
  GroupColorId,
  GroupSubStep,
  InterestGroupsByColor,
  InterestTagColors,
} from '@/lib/startProgram/step02Constants';
import { orderedUsedColorIds } from '@/lib/startProgram/step02Constants';

export type StrengthPhase = 'dig' | 'group' | 'sentence';

export const STRENGTH_PHASES: {
  id: StrengthPhase;
  label: string;
  available: boolean;
}[] = [
  { id: 'dig', label: '掘り下げ', available: true },
  { id: 'group', label: 'まとめる', available: true },
  { id: 'sentence', label: '文にする', available: true },
];

export const STRENGTH_STORAGE_KEY = 'startProgram.sevenSteps.step02.strength';
export const STRENGTH_DUMMY_PATH =
  '/start-program/seven-steps/step02/dummy/yuko-persona.json';

export const STRENGTH_OPTION_MAX_CHARS = 80;
export const STRENGTH_EPISODE_MAX_CHARS = 200;
export const STRENGTH_EMOTION_MAX_CHARS = 100;
/** 付加ソース（他者の言葉／自然体験）合計で最低完了件数 */
export const STRENGTH_ADDITIVE_MIN_REQUIRED = 1;
export const STRENGTH_EPISODE_MAX_ROWS_PER_KIND = 5;
export const STRENGTH_PILL_PREVIEW_CHARS = 5;
export const STRENGTH_SENTENCE_PHRASE_MAX = 80;
export const STRENGTH_SENTENCE_ACTION_MAX = 120;
export const STRENGTH_SENTENCE_MAX_GROUPS = 5;

/** 付加エピソードの種類 */
export type StrengthEpisodeKind = 'praise' | 'natural';

export type StrengthOption = {
  id: string;
  sourceId: string;
  sourceType: 'wish' | 'episode';
  label: string;
  source: 'ai' | 'manual' | 'dummy';
  selected: boolean;
};

export type StrengthEpisode = {
  id: string;
  kind: StrengthEpisodeKind;
  episode: string;
  emotion: string;
  options: StrengthOption[];
};

export type StrengthOptionsByWish = Record<string, StrengthOption[]>;

export type StrengthUiState = {
  phase: StrengthPhase;
  groupSubStep: GroupSubStep;
  openWishId: string | null;
  openEpisodeId: string | null;
  selectedTagIds: string[];
  activeColorId: Exclude<GroupColorId, 'other'> | null;
};

export type Step02StrengthStore = {
  optionsByWish: StrengthOptionsByWish;
  episodes: StrengthEpisode[];
  tagColors: InterestTagColors;
  groups: InterestGroupsByColor;
  sentences: StrengthSentencesByColor;
  colorHistory: InterestTagColors[];
  ui: StrengthUiState;
};

export type StrengthTag = {
  id: string;
  label: string;
  sourceType: 'wish' | 'episode';
  sourceId: string;
  colorId?: GroupColorId;
};

export type StrengthPredicateId = 'goodAt' | 'strength' | 'natural' | 'custom';

export const STRENGTH_KEY_PREDICATES: {
  id: StrengthPredicateId;
  label: string;
}[] = [
  { id: 'goodAt', label: 'が得意だ' },
  { id: 'strength', label: 'が強みだ' },
  { id: 'natural', label: 'が自然にできる' },
  { id: 'custom', label: '（自由に書く）' },
];

export type StrengthKeySentence = {
  groupColorId: GroupColorId;
  strengthPhrase: string;
  predicate: StrengthPredicateId;
  customPredicate: string;
  actionPhrase: string;
};

export type StrengthSentencesByColor = Partial<
  Record<GroupColorId, StrengthKeySentence>
>;

export function createStrengthOptionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sopt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStrengthEpisodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyStrengthEpisode(
  kind: StrengthEpisodeKind
): StrengthEpisode {
  return {
    id: createStrengthEpisodeId(),
    kind,
    episode: '',
    emotion: '',
    options: [],
  };
}

export function defaultStrengthStore(): Step02StrengthStore {
  return {
    optionsByWish: {},
    episodes: [emptyStrengthEpisode('praise'), emptyStrengthEpisode('natural')],
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

export function truncateStrengthPill(
  label: string,
  max = STRENGTH_PILL_PREVIEW_CHARS
): string {
  const chars = [...label];
  if (chars.length <= max) return label;
  return `${chars.slice(0, max).join('')}…`;
}

export function flattenSelectedStrengthTags(
  optionsByWish: StrengthOptionsByWish,
  episodes: StrengthEpisode[],
  tagColors: InterestTagColors
): StrengthTag[] {
  const tags: StrengthTag[] = [];
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

export function isStrengthEpisodeComplete(ep: StrengthEpisode): boolean {
  return (
    ep.episode.trim().length > 0 &&
    ep.emotion.trim().length > 0 &&
    ep.options.some((o) => o.selected)
  );
}

export function countCompleteStrengthEpisodes(
  episodes: StrengthEpisode[]
): number {
  return episodes.filter(isStrengthEpisodeComplete).length;
}

export function countCompleteByKind(
  episodes: StrengthEpisode[],
  kind: StrengthEpisodeKind
): number {
  return episodes.filter((e) => e.kind === kind && isStrengthEpisodeComplete(e))
    .length;
}

export function emptyStrengthSentence(
  groupColorId: GroupColorId,
  title = ''
): StrengthKeySentence {
  return {
    groupColorId,
    strengthPhrase: title,
    predicate: 'goodAt',
    customPredicate: '',
    actionPhrase: '',
  };
}

export function strengthPredicateLabel(
  predicate: StrengthPredicateId,
  custom: string
): string {
  if (predicate === 'strength') return 'が強みだ';
  if (predicate === 'natural') return 'が自然にできる';
  if (predicate === 'custom') return custom.trim() || '……';
  return 'が得意だ';
}

export function formatStrengthKeySentence(s: StrengthKeySentence): string {
  const phrase = s.strengthPhrase.trim() || '＿＿＿＿';
  const pred = strengthPredicateLabel(s.predicate, s.customPredicate);
  const action = s.actionPhrase.trim() || '＿＿＿＿';
  return `私は、${phrase}${pred}。だから、${action}のだ。`;
}

export function ensureStrengthSentencesFromGroups(
  tagColors: InterestTagColors,
  groups: InterestGroupsByColor,
  sentences: StrengthSentencesByColor
): StrengthSentencesByColor {
  const next = { ...sentences };
  for (const colorId of orderedUsedColorIds(tagColors)) {
    const title = groups[colorId]?.title?.trim() ?? '';
    const existing = next[colorId];
    if (!existing) {
      next[colorId] = emptyStrengthSentence(colorId, title);
    } else if (!existing.strengthPhrase.trim() && title) {
      next[colorId] = { ...existing, strengthPhrase: title };
    }
  }
  return next;
}

export type { MandalaDomainId, GroupColorId, InterestTagColors };
