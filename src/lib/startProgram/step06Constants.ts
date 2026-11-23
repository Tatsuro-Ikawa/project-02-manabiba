/** Step6 — なし方・あり方の望む姿と、Step2 の自分らしさとの照合 */

import { haveLinkReady, type Step05Theme } from '@/lib/startProgram/step05Constants';

export const STEP06_PHASES: { id: Step06Phase; label: string }[] = [
  { id: 'pose', label: '望む姿を設定' },
  { id: 'self', label: '自分らしさと照らす' },
];

export type Step06Phase = 'pose' | 'self';

export function parseStep06Phase(raw: string | null): Step06Phase | null {
  return raw === 'pose' || raw === 'self' ? raw : null;
}

/**
 * Step5-3 で持ち方・なし方・アクセルが紐づいていれば、望む姿の入力は完了とみなす。
 * （照合画面は廃止予定。Step6 冒頭まとめへ置き換える）
 */
export function step06WaysFilled(theme: Step05Theme | undefined, _reasons?: unknown): boolean {
  return theme != null && haveLinkReady(theme);
}

/** 望む姿がそろい、自分らしさの3問に答えた（fit は廃止予定のため、紐づけ完了で足りる） */
export function step06SelfDone(theme: Step05Theme | undefined, reasons?: unknown): boolean {
  return step06WaysFilled(theme, reasons);
}
