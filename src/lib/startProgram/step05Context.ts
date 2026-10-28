/** Step5 — Step1〜4 からの引き継ぎ（参照表示と AI の入力） */

import { getMandalaDomain, type MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import type { MandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import { STEP02_INTEREST_STORAGE_KEY, formatKeySentence, type KeySentence } from '@/lib/startProgram/step02Constants';
import {
  STRENGTH_STORAGE_KEY,
  formatStrengthKeySentence,
  type StrengthKeySentence,
} from '@/lib/startProgram/step02StrengthConstants';
import {
  VALUES_STORAGE_KEY,
  formatValuesKeySentence,
  type ValuesKeySentence,
} from '@/lib/startProgram/step02ValuesConstants';
import { isValidSatisfactionScore, type Step03SatisfactionStore } from '@/lib/startProgram/step03Constants';
import {
  STEP04_LAYERS,
  actionableReasons,
  deferredReasons,
  getLayerOption,
  type LayerKey,
  type LayerTagId,
  type ReasonEntry,
  type Step04Theme,
} from '@/lib/startProgram/step04Constants';
import { picks } from '@/lib/startProgram/step04DeepDiveConstants';
import {
  STEP05_DUMMY_REFS_KEY,
  answerSlots,
  newItem,
  type FitKey,
  type Step05DummyRefs,
  type Step05Item,
  type TargetScore,
} from '@/lib/startProgram/step05Constants';

export type SelfSentences = Record<FitKey, string[]>;

export type TagEntry = { tagId: LayerTagId; label: string; reasonIds: string[] };

export type Step05Insight = {
  reasonId: string;
  reasonText: string;
  ownWords: string;
  workings: string[];
  /** Step4 の深掘りで選んだ場面 */
  scenes: string[];
};

export type Step05Context = {
  domainId: MandalaDomainId;
  domainLabel: string;
  score: number | null;
  centerGoal: string;
  wishes: string[];
  self: SelfSentences;
  reasons: ReasonEntry[];
  deferred: ReasonEntry[];
  insights: Step05Insight[];
  tagEntries: Record<LayerKey, TagEntry[]>;
};

function readSentences<T>(key: string, format: (s: T) => string, phrase: (s: T) => string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { sentences?: Record<string, T | undefined> };
    return Object.values(parsed.sentences ?? {})
      .filter((s): s is T => !!s && phrase(s).trim().length > 0)
      .map(format);
  } catch {
    return [];
  }
}

/** Step2 の「文にする」で作った文。未記入ならダミー読み込み時の参照文を使う */
export function readSelfSentences(): SelfSentences {
  const empty: SelfSentences = { interest: [], values: [], strength: [] };
  if (typeof window === 'undefined') return empty;
  const fromStep02: SelfSentences = {
    interest: readSentences<KeySentence>(STEP02_INTEREST_STORAGE_KEY, formatKeySentence, (s) => s.interestPhrase),
    values: readSentences<ValuesKeySentence>(VALUES_STORAGE_KEY, formatValuesKeySentence, (s) => s.valuePhrase),
    strength: readSentences<StrengthKeySentence>(
      STRENGTH_STORAGE_KEY,
      formatStrengthKeySentence,
      (s) => s.strengthPhrase
    ),
  };
  if (Object.values(fromStep02).some((list) => list.length > 0)) return fromStep02;
  const self = readDummyRefs().self ?? {};
  return { interest: strList(self.interest), values: strList(self.values), strength: strList(self.strength) };
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function readDummyRefs(): Step05DummyRefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STEP05_DUMMY_REFS_KEY);
    return raw ? (JSON.parse(raw) as Step05DummyRefs) : {};
  } catch {
    return {};
  }
}

function tagLabel(reason: ReasonEntry, layer: LayerKey, tagId: LayerTagId): string {
  const opt = getLayerOption(tagId)?.option;
  if (opt?.isOther) return reason.otherText[layer].trim() || 'その他';
  return opt?.label ?? tagId;
}

function aggregateTags(reasons: ReasonEntry[]): Record<LayerKey, TagEntry[]> {
  const out: Record<LayerKey, TagEntry[]> = { have: [], do: [], be: [] };
  for (const layer of STEP04_LAYERS) {
    for (const r of reasons) {
      for (const tagId of r.tags[layer.key]) {
        const label = tagLabel(r, layer.key, tagId);
        const hit = out[layer.key].find((e) => e.tagId === tagId && e.label === label);
        if (hit) hit.reasonIds.push(r.id);
        else out[layer.key].push({ tagId, label, reasonIds: [r.id] });
      }
    }
    out[layer.key].sort((a, b) => b.reasonIds.length - a.reasonIds.length);
  }
  return out;
}

export function buildStep05Context(
  step01: MandalaLocalStore,
  step03: Step03SatisfactionStore,
  theme: Step04Theme,
  self: SelfSentences
): Step05Context {
  const rawScore = step03.domains[theme.domainId]?.score;
  const reasons = actionableReasons(theme);
  const insights: Step05Insight[] = reasons
    .filter((r) => theme.deepDive[r.id]?.insightSavedAt != null)
    .map((r) => {
      const dd = theme.deepDive[r.id];
      const hyps = dd.working.hypotheses.data ?? [];
      const rated = (rating: string) => hyps.filter((h) => dd.working.ratings[h.id] === rating).map((h) => h.title);
      const strong = rated('strong');
      return {
        reasonId: r.id,
        reasonText: r.text.trim(),
        ownWords: dd.working.ownWords.trim(),
        workings: strong.length > 0 ? strong : rated('some'),
        scenes: picks(dd.entry.scene)
          .map((s) => s.trim())
          .filter(Boolean),
      };
    });
  return {
    domainId: theme.domainId,
    domainLabel: getMandalaDomain(theme.domainId)?.label ?? '',
    score: isValidSatisfactionScore(rawScore) ? rawScore : null,
    centerGoal: step01.centerGoal.trim(),
    wishes: (step01.domains[theme.domainId] ?? []).map((e) => e.text.trim()).filter(Boolean),
    self,
    reasons,
    deferred: deferredReasons(theme),
    insights,
    tagEntries: aggregateTags(reasons),
  };
}

/** 課題 × Step4 で選んだタグごとに、目標の欄を1つ作る */
export function seedItems(ctx: Step05Context): Step05Item[] {
  return answerSlots(ctx.reasons).map((slot) => newItem(slot.layer, slot.tagId, '', slot.reasonId));
}

export function entryLabel(ctx: Step05Context, layer: LayerKey, tagId: LayerTagId | null): string | null {
  if (!tagId) return null;
  return ctx.tagEntries[layer].find((e) => e.tagId === tagId)?.label ?? getLayerOption(tagId)?.option.label ?? null;
}

export function candidatesInputKey(ctx: Step05Context, targetScore: TargetScore): string {
  return JSON.stringify([
    ctx.domainId,
    targetScore,
    ctx.reasons.map((r) => [r.text.trim(), r.tags]),
    ctx.insights.map((i) => i.ownWords),
  ]);
}
