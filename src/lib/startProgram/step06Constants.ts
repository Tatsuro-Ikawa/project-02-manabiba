/** Step6 — なし方・あり方の望む姿と、Step2 の自分らしさとの照合 */

import {
  answerOf,
  answerSlots,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';

export const STEP06_PHASES: { id: Step06Phase; label: string }[] = [
  { id: 'pose', label: '望む姿を設定' },
  { id: 'self', label: '自分らしさと照らす' },
];

export type Step06Phase = 'pose' | 'self';

type Step06Reasons = Parameters<typeof answerSlots>[0];

export function parseStep06Phase(raw: string | null): Step06Phase | null {
  return raw === 'pose' || raw === 'self' ? raw : null;
}

/** Step4 で選んだなし方・あり方の欄がすべて埋まっている */
export function step06WaysFilled(theme: Step05Theme | undefined, reasons: Step06Reasons): boolean {
  if (!theme) return false;
  const slots = answerSlots(reasons).filter((slot) => slot.layer === 'do' || slot.layer === 'be');
  return (
    slots.length > 0 &&
    slots.every((slot) => (answerOf(theme, slot.reasonId, slot.tagId)?.target.trim() ?? '') !== '')
  );
}

/** 望む姿がそろい、自分らしさの3問に答えた */
export function step06SelfDone(theme: Step05Theme | undefined, reasons: Step06Reasons): boolean {
  if (!theme || !step06WaysFilled(theme, reasons)) return false;
  return Object.values(theme.fit).every((rating) => rating != null);
}
