/** Step1 曼荼羅チャート — 8 領域定数 */

import type { WishMotivation } from '@/lib/startProgram/wishMotivation';

export type { WishMotivation };

export type MandalaDomainId =
  | 'social_contribution'
  | 'career'
  | 'health'
  | 'spirituality'
  | 'learning'
  | 'money'
  | 'hobbies'
  | 'relationships';

export type MandalaDomainDef = {
  id: MandalaDomainId;
  label: string;
  subtitle: string;
  /** Material Symbols 名 */
  icon: string;
  /** 3×3 グリッド上の位置（0〜8、4=中心は除外） */
  gridIndex: number;
};

export const MANDALA_ENTRY_MAX_CHARS = 150;
export const MANDALA_CENTER_GOAL_MAX_CHARS = 150;
export const MANDALA_DOMAIN_MAX_ENTRIES = 20;

/**
 * PC 3×3 配置（中心は center_goal）:
 * [社会貢献] [キャリア] [健康]
 * [精神性]   [中心]     [学習]
 * [人間関係] [趣味]     [お金]
 */
export const MANDALA_DOMAINS: MandalaDomainDef[] = [
  {
    id: 'social_contribution',
    label: '社会貢献',
    subtitle: '社会への貢献と還元',
    icon: 'volunteer_activism',
    gridIndex: 0,
  },
  {
    id: 'career',
    label: 'キャリア・仕事',
    subtitle: '仕事での成長と貢献',
    icon: 'work',
    gridIndex: 1,
  },
  {
    id: 'health',
    label: '健康・ウェルネス',
    subtitle: '心身の健康維持',
    icon: 'ecg_heart',
    gridIndex: 2,
  },
  {
    id: 'spirituality',
    label: '精神性・内面',
    subtitle: '心の平安と成長',
    icon: 'self_improvement',
    gridIndex: 3,
  },
  {
    id: 'learning',
    label: '学習・経験',
    subtitle: '継続的な学びと成長',
    icon: 'menu_book',
    gridIndex: 5,
  },
  {
    id: 'relationships',
    label: '人間関係・家族',
    subtitle: '良好な関係性の構築',
    icon: 'groups',
    gridIndex: 6,
  },
  {
    id: 'hobbies',
    label: '趣味・芸術',
    subtitle: '遊びを楽しむ時間',
    icon: 'palette',
    gridIndex: 7,
  },
  {
    id: 'money',
    label: 'お金・財産',
    subtitle: '経済的な安定と成長',
    icon: 'payments',
    gridIndex: 8,
  },
];

export type MandalaEntryLocal = {
  id: string;
  text: string;
  domainId: MandalaDomainId;
  /** なぜその願望があるか（Step1 入力時に選択） */
  motivation?: WishMotivation;
  createdAt: number;
  updatedAt: number;
  sortOrder: number;
};

export type MandalaDomainsState = Record<MandalaDomainId, MandalaEntryLocal[]>;

export function emptyMandalaDomains(): MandalaDomainsState {
  return {
    social_contribution: [],
    career: [],
    health: [],
    spirituality: [],
    learning: [],
    money: [],
    hobbies: [],
    relationships: [],
  };
}

export function countUnicodeChars(s: string): number {
  return [...s].length;
}

export function createMandalaEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMandalaDomain(id: MandalaDomainId): MandalaDomainDef | undefined {
  return MANDALA_DOMAINS.find((d) => d.id === id);
}

/** gridIndex 順（0〜8、4 は中心で domains に無い） */
export function mandalaDomainsByGridOrder(): (MandalaDomainDef | 'center')[] {
  const byIndex = new Map(MANDALA_DOMAINS.map((d) => [d.gridIndex, d]));
  const cells: (MandalaDomainDef | 'center')[] = [];
  for (let i = 0; i < 9; i++) {
    if (i === 4) cells.push('center');
    else cells.push(byIndex.get(i)!);
  }
  return cells;
}

/** Step2 深掘り用 — エントリ ID → 動機分類 */
export function mandalaClassificationMap(
  domains: MandalaDomainsState
): Record<string, WishMotivation> {
  const map: Record<string, WishMotivation> = {};
  for (const domain of MANDALA_DOMAINS) {
    for (const entry of domains[domain.id]) {
      if (entry.text.trim() && entry.motivation) {
        map[entry.id] = entry.motivation;
      }
    }
  }
  return map;
}
