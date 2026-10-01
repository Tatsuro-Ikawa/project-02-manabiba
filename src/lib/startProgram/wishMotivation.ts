/** 願望の動機分類（Step1 入力時に紐づけ → Step2 深掘りで参照） */

export type WishMotivation = 'interest' | 'values' | 'strength' | 'other';

export const MOTIVATION_OPTIONS: {
  id: WishMotivation;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'interest',
    label: '興味・関心が強いから',
    shortLabel: 'A',
    description: 'ワクワクする・惹かれる・没頭したい',
  },
  {
    id: 'values',
    label: '価値観に合っているから',
    shortLabel: 'B',
    description: '大切・正しい・心が動く',
  },
  {
    id: 'strength',
    label: '得意・上手にできるから',
    shortLabel: 'C',
    description: '自然にできる・続けやすい',
  },
  {
    id: 'other',
    label: 'その他',
    shortLabel: 'D',
    description: '上記に当てはまらない／まだわからない',
  },
];

export function motivationShortLabel(id: WishMotivation | undefined): string {
  if (!id) return '—';
  return MOTIVATION_OPTIONS.find((o) => o.id === id)?.shortLabel ?? '—';
}

export function motivationLabel(id: WishMotivation | undefined): string {
  if (!id) return '';
  return MOTIVATION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function isDeepDiveMotivation(
  m: WishMotivation | undefined
): m is 'interest' | 'values' | 'strength' {
  return m === 'interest' || m === 'values' || m === 'strength';
}
