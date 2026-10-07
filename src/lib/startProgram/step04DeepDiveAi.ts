/**
 * Step4 こころの深掘り — AI 呼び出し（モックはダミー応答）
 * 本番 AI に差し替えるときは、同じ関数シグネチャのまま中身を置き換える。
 */

import {
  BASE_ACTIONS_EXTRA,
  BASE_FEELINGS_EXTRA,
  BASE_PROTECTIONS_EXTRA,
  BASE_SCENES_EXTRA,
  BASE_VOICES_EXTRA,
  DEFAULT_HYPOTHESIS_KEYS,
  baseEntryOptions,
  baseInnerOptions,
  hypothesisFromProtection,
  picks,
  type DeepDiveContext,
  type DeepDiveEntry,
  type EntryOptions,
  type Hypothesis,
  type InnerOptions,
} from '@/lib/startProgram/step04DeepDiveConstants';

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
}

/** variant > 0（Ai更新）のとき、並びを回転し末尾を予備の選択肢と入れ替える */
function vary(list: string[], extras: string[], variant: number): string[] {
  if (variant <= 0) return list;
  const shift = variant % list.length;
  const rotated = [...list.slice(shift), ...list.slice(0, shift)];
  const swapCount = Math.min(2, extras.length);
  const start = ((variant - 1) * swapCount) % Math.max(1, extras.length);
  const swaps = Array.from({ length: swapCount }, (_, i) => extras[(start + i) % extras.length]);
  return [...rotated.slice(0, rotated.length - swapCount), ...swaps.filter((s) => !rotated.includes(s))];
}

/** AI-1：課題＋あり方 → 場面・行動 */
export async function generateEntryOptions(ctx: DeepDiveContext, variant = 0): Promise<EntryOptions> {
  await wait();
  const base = baseEntryOptions(ctx);
  return {
    sceneQuestion: base.sceneQuestion,
    scenes: vary(base.scenes, BASE_SCENES_EXTRA, variant),
    actions: vary(base.actions, BASE_ACTIONS_EXTRA, variant),
  };
}

/** AI-2：課題＋場面＋行動 → 気持ち・こころの声・こころの抵抗 */
export async function generateInnerOptions(
  _ctx: DeepDiveContext,
  _entry: { scenes: string[]; actions: string[] },
  variant = 0
): Promise<InnerOptions> {
  await wait();
  const base = baseInnerOptions();
  const fixedTail = base.protections.filter((p) => p === 'よく分からない');
  return {
    feelings: vary(base.feelings, BASE_FEELINGS_EXTRA, variant),
    voices: vary(base.voices, BASE_VOICES_EXTRA, variant),
    protections: [
      ...vary(
        base.protections.filter((p) => p !== 'よく分からない'),
        BASE_PROTECTIONS_EXTRA,
        variant
      ),
      ...fixedTail,
    ],
  };
}

/** AI-3：全回答 → こころの働きの仮説 2〜3件 */
export async function generateWorkingHypotheses(
  _ctx: DeepDiveContext,
  dd: DeepDiveEntry
): Promise<Hypothesis[]> {
  await wait();
  const chosen = picks(dd.inner.protection).filter((p) => p !== 'よく分からない');
  const keys = [...new Set([...chosen, ...DEFAULT_HYPOTHESIS_KEYS])].slice(0, Math.max(2, Math.min(3, chosen.length + 1)));
  const voices = [...picks(dd.inner.voice), dd.inner.voiceOwnWords.trim()].filter(Boolean);
  const actions = picks(dd.entry.action);
  const feelings = picks(dd.inner.feeling);
  return keys.map((key, i) => {
    const h = hypothesisFromProtection(key);
    const links = [voices[i % Math.max(1, voices.length)], actions[i % Math.max(1, actions.length)], feelings[i % Math.max(1, feelings.length)]]
      .filter((s): s is string => Boolean(s))
      .map((s) => s.replace(/^「|」$/g, ''));
    return { ...h, links: [...new Set(links)] };
  });
}
