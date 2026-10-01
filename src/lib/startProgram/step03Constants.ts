/** Step3 満足度〜取組領域 — 定数・型 */

import {
  MANDALA_DOMAINS,
  type MandalaDomainId,
  emptyMandalaDomains,
} from '@/lib/startProgram/mandalaConstants';

export const STEP03_SATISFACTION_STORAGE_KEY =
  'startProgram.sevenSteps.step03.satisfaction';

export const STEP03_SCORE_MIN = 0;
export const STEP03_SCORE_MAX = 10;
export const STEP03_CANDIDATE_MAX_DEFAULT = 4;
export const STEP03_CANDIDATE_MAX_MIN = 1;
export const STEP03_CANDIDATE_MAX_MAX = 8;
/** @deprecated 既定値のエイリアス。動的上限は `readStep03CandidateMax` を使う */
export const STEP03_CANDIDATE_MAX = STEP03_CANDIDATE_MAX_DEFAULT;
export const STEP03_RADAR_NOTE_MAX_CHARS = 200;

export type Step03Phase = 'score' | 'radar' | 'focus';

export const STEP03_PHASES: { id: Step03Phase; label: string }[] = [
  { id: 'score', label: '満足度' },
  { id: 'radar', label: 'レーダーチャート' },
  { id: 'focus', label: '取組領域' },
];

export type DomainSatisfaction = {
  score: number | null;
};

export type RadarNotes = {
  bulge: string;
  imbalance: string;
  lighten: string;
};

export type FocusCriteria = {
  importance: number | null;
  excitement: number | null;
  feasibility: number | null;
};

export type Step03SatisfactionStore = {
  version: 2;
  domains: Record<MandalaDomainId, DomainSatisfaction>;
  radarNotes: RadarNotes;
  candidateDomainIds: MandalaDomainId[];
  criteriaByDomain: Partial<Record<MandalaDomainId, FocusCriteria>>;
  focusDomainId: MandalaDomainId | null;
};

export type RadarPatternId = 'A' | 'B' | 'C' | 'mixed';

export const RADAR_PATTERN_GUIDE: Record<
  RadarPatternId,
  { title: string; look: string; tip: string }
> = {
  A: {
    title: 'パターンA：偏り型',
    look: '一部が高く、他が凹んでいる',
    tip: '低い領域を整えると、全体の幸福感が高まりやすいです',
  },
  B: {
    title: 'パターンB：全体低型',
    look: 'ほぼ5点以下で全体的に低い',
    tip: '自分らしさを高めやすい領域から選ぶと効果が大きいです（Step2のアクセルも参考に）',
  },
  C: {
    title: 'パターンC：全体高・一部低',
    look: '全体は高いが一部だけ凹んでいる',
    tip: '凹みにフォーカスすると、人生の統合感が生まれやすいです',
  },
  mixed: {
    title: 'バランスを見てみましょう',
    look: '明確な偏り・全体低・一部凹み、のいずれにも当てはまりにくい形',
    tip: '気になる凹みや、整うと軽くなりそうな領域から候補を挙げてみてください',
  },
};

export function emptyDomainSatisfaction(): DomainSatisfaction {
  return { score: null };
}

export function emptyRadarNotes(): RadarNotes {
  return { bulge: '', imbalance: '', lighten: '' };
}

export function emptyFocusCriteria(): FocusCriteria {
  return { importance: null, excitement: null, feasibility: null };
}

export function emptyStep03Domains(): Record<MandalaDomainId, DomainSatisfaction> {
  const empty = emptyMandalaDomains();
  const out = {} as Record<MandalaDomainId, DomainSatisfaction>;
  for (const id of Object.keys(empty) as MandalaDomainId[]) {
    out[id] = emptyDomainSatisfaction();
  }
  return out;
}

export function emptyStep03Store(): Step03SatisfactionStore {
  return {
    version: 2,
    domains: emptyStep03Domains(),
    radarNotes: emptyRadarNotes(),
    candidateDomainIds: [],
    criteriaByDomain: {},
    focusDomainId: null,
  };
}

export function isValidSatisfactionScore(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= STEP03_SCORE_MIN &&
    n <= STEP03_SCORE_MAX
  );
}

export function isStep03Phase(v: unknown): v is Step03Phase {
  return v === 'score' || v === 'radar' || v === 'focus';
}

export function countScoredDomains(
  domains: Record<MandalaDomainId, DomainSatisfaction>
): number {
  return Object.values(domains).filter((d) => isValidSatisfactionScore(d.score)).length;
}

export function allDomainsScored(
  domains: Record<MandalaDomainId, DomainSatisfaction>
): boolean {
  return countScoredDomains(domains) === MANDALA_DOMAINS.length;
}

/** 満足度の低い順（同点は領域定義順）。最大 n 件の domainId */
export function lowestScoreDomainIds(
  domains: Record<MandalaDomainId, DomainSatisfaction>,
  n = 3
): MandalaDomainId[] {
  return domainsSortedBySatisfactionAsc(domains)
    .slice(0, n)
    .map((x) => x.id);
}

/** 全領域を満足度昇順（未採点は末尾）。同点は MANDALA_DOMAINS 定義順 */
export function domainsSortedBySatisfactionAsc(
  domains: Record<MandalaDomainId, DomainSatisfaction>
): { id: MandalaDomainId; score: number | null }[] {
  return MANDALA_DOMAINS.map((d) => ({
    id: d.id,
    score: isValidSatisfactionScore(domains[d.id]?.score)
      ? (domains[d.id].score as number)
      : null,
  })).sort((a, b) => {
    if (a.score == null && b.score == null) return 0;
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return a.score - b.score;
  });
}

export function criteriaTotal(c: FocusCriteria | undefined): number | null {
  if (!c) return null;
  if (
    !isValidSatisfactionScore(c.importance) ||
    !isValidSatisfactionScore(c.excitement) ||
    !isValidSatisfactionScore(c.feasibility)
  ) {
    return null;
  }
  return c.importance + c.excitement + c.feasibility;
}

/** 候補のうち合計最大の領域。同点は配列先頭を優先せず null（明示選択が必要） */
export function suggestFocusDomainId(
  candidateIds: MandalaDomainId[],
  criteriaByDomain: Partial<Record<MandalaDomainId, FocusCriteria>>
): { bestId: MandalaDomainId | null; tied: boolean } {
  let best: MandalaDomainId | null = null;
  let bestTotal = -1;
  let tied = false;
  for (const id of candidateIds) {
    const t = criteriaTotal(criteriaByDomain[id]);
    if (t == null) continue;
    if (t > bestTotal) {
      bestTotal = t;
      best = id;
      tied = false;
    } else if (t === bestTotal) {
      tied = true;
    }
  }
  if (tied) return { bestId: null, tied: true };
  return { bestId: best, tied: false };
}

export function detectRadarPattern(
  domains: Record<MandalaDomainId, DomainSatisfaction>
): RadarPatternId {
  const scores = MANDALA_DOMAINS.map((d) => domains[d.id]?.score).filter(
    (s): s is number => isValidSatisfactionScore(s)
  );
  if (scores.length < 8) return 'mixed';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const spread = max - min;

  if (avg <= 5 && max <= 6) return 'B';
  if (avg >= 6.5 && spread >= 3 && min <= avg - 2) return 'C';
  if (spread >= 4) return 'A';
  return 'mixed';
}

export function parseStep03Phase(raw: string | null | undefined): Step03Phase {
  if (isStep03Phase(raw)) return raw;
  return 'score';
}
