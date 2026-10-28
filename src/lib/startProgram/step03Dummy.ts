/** Step3・Step4（こころの深掘りまで）確認用ダミーデータの読み込み */

import { readStep03CandidateMax } from '@/lib/startProgram/appSettings';
import {
  MANDALA_DOMAINS,
  emptyMandalaDomains,
  type MandalaDomainId,
  type MandalaEntryLocal,
} from '@/lib/startProgram/mandalaConstants';
import type { DummyPersonaFile } from '@/lib/startProgram/step02Constants';
import {
  emptyFocusCriteria,
  emptyRadarNotes,
  emptyStep03Domains,
  isValidSatisfactionScore,
  type FocusCriteria,
  type RadarNotes,
  type Step03SatisfactionStore,
} from '@/lib/startProgram/step03Constants';
import {
  STEP04_STORAGE_KEY,
  createReasonId,
  emptyLayerOtherText,
  emptyLayerTags,
  type Changeability,
  type LayerKey,
  type LayerTagId,
  type ReasonEntry,
  type Step04Store,
} from '@/lib/startProgram/step04Constants';
import { buildDummyHypotheses } from '@/lib/startProgram/step04DeepDiveAi';
import {
  baseEntryOptions,
  baseInnerOptions,
  buildDeepDiveContext,
  emptyDeepDiveEntry,
  entryInputKey,
  innerInputKey,
  workingInputKey,
  type DeepDiveEntry,
  type PickAnswer,
  type WorkingRating,
} from '@/lib/startProgram/step04DeepDiveConstants';

export const STEP03_DUMMY_PERSONAS: { id: string; label: string; path: string }[] = [
  { id: 'yuko', label: '裕子さん', path: '/start-program/seven-steps/step03/dummy/yuko-step03-04.json' },
  { id: 'kota', label: '康太さん', path: '/start-program/seven-steps/step03/dummy/kota-step03-04.json' },
];

export type Step03DummyFile = {
  persona: { name: string; note: string };
  /** Step1 の願望を読む Step2 ペルソナ JSON */
  step01Source: string;
  step03: {
    scores: Partial<Record<MandalaDomainId, number>>;
    radarNotes: Partial<RadarNotes>;
    candidateDomainIds: MandalaDomainId[];
    criteriaByDomain: Partial<Record<MandalaDomainId, Partial<FocusCriteria>>>;
    focusDomainId: MandalaDomainId | null;
  };
  step04: {
    reasons: {
      text: string;
      changeability: Changeability | null;
      tags?: Partial<Record<LayerKey, LayerTagId[]>>;
      otherText?: Partial<Record<LayerKey, string>>;
      deepDive?: DummyDeepDive;
    }[];
  };
};

/** 回答がそろった段階までを保存済みとして復元する（場面・行動 → 気持ち〜抵抗 → 自分の言葉） */
type DummyDeepDive = {
  scene?: string[];
  action?: string[];
  feeling?: string[];
  voice?: string[];
  voiceOwnWords?: string;
  protection?: string[];
  /** キーは「こころの抵抗」の選択肢（仮説 ID） */
  ratings?: Record<string, WorkingRating>;
  ownWords?: string;
  insightSaved?: boolean;
};

export type Step03DummyBundle = {
  personaName: string;
  step01: { domains: ReturnType<typeof emptyMandalaDomains>; centerGoal: string };
  step03: Step03SatisfactionStore;
  step04: Step04Store;
};

function isDomainId(v: unknown): v is MandalaDomainId {
  return typeof v === 'string' && MANDALA_DOMAINS.some((d) => d.id === v);
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`dummy fetch failed: ${path}`);
  return (await res.json()) as T;
}

function buildStep01(persona: DummyPersonaFile): Step03DummyBundle['step01'] {
  const domains = emptyMandalaDomains();
  const now = Date.now();
  persona.wishes.forEach((w, sortOrder) => {
    const entry: MandalaEntryLocal = {
      id: w.id,
      text: w.text,
      domainId: w.domainId,
      motivation: w.motivation,
      createdAt: now,
      updatedAt: now,
      sortOrder,
    };
    domains[w.domainId] = [...domains[w.domainId], entry];
  });
  return { domains, centerGoal: persona.centerGoal };
}

function buildStep03(src: Step03DummyFile['step03']): Step03SatisfactionStore {
  const domains = emptyStep03Domains();
  for (const id of Object.keys(domains) as MandalaDomainId[]) {
    const s = src.scores[id];
    domains[id] = { score: isValidSatisfactionScore(s) ? s : null };
  }
  const candidateDomainIds = [...new Set(src.candidateDomainIds.filter(isDomainId))].slice(
    0,
    readStep03CandidateMax()
  );
  const criteriaByDomain: Partial<Record<MandalaDomainId, FocusCriteria>> = {};
  for (const id of candidateDomainIds) {
    criteriaByDomain[id] = { ...emptyFocusCriteria(), ...src.criteriaByDomain[id] };
  }
  const focusDomainId =
    src.focusDomainId && candidateDomainIds.includes(src.focusDomainId) ? src.focusDomainId : null;
  return {
    version: 2,
    domains,
    radarNotes: { ...emptyRadarNotes(), ...src.radarNotes },
    candidateDomainIds,
    criteriaByDomain,
    focusDomainId,
  };
}

function toPick(values: string[] | undefined, options: string[]): PickAnswer {
  const v = values ?? [];
  return { selected: v.filter((x) => options.includes(x)), custom: v.filter((x) => !options.includes(x)) };
}

function readySlot<T>(data: T, inputKey: string) {
  return { status: 'ready' as const, data, inputKey, refreshCount: 0, refreshedNotice: false };
}

function buildDeepDive(domainId: MandalaDomainId, reason: ReasonEntry, src: DummyDeepDive): DeepDiveEntry {
  const ctx = buildDeepDiveContext(domainId, reason);
  const now = Date.now();
  const dd = emptyDeepDiveEntry(reason.id);
  const entryOpts = baseEntryOptions(ctx);
  dd.entry.options = readySlot(entryOpts, entryInputKey(ctx));
  if (!src.scene?.length || !src.action?.length) return dd;
  dd.entry = {
    ...dd.entry,
    scene: toPick(src.scene, entryOpts.scenes),
    action: toPick(src.action, entryOpts.actions),
    savedAt: now,
  };

  const innerOpts = baseInnerOptions();
  dd.inner.options = readySlot(innerOpts, innerInputKey(ctx, dd));
  const hasVoice = (src.voice?.length ?? 0) > 0 || Boolean(src.voiceOwnWords?.trim());
  if (!src.feeling?.length || !hasVoice || !src.protection?.length) return dd;
  dd.inner = {
    ...dd.inner,
    feeling: toPick(src.feeling, innerOpts.feelings),
    voice: toPick(src.voice, innerOpts.voices),
    voiceOwnWords: src.voiceOwnWords?.trim() ?? '',
    protection: toPick(src.protection, innerOpts.protections),
    savedAt: now,
  };

  dd.working.hypotheses = readySlot(buildDummyHypotheses(dd), workingInputKey(ctx, dd));
  if (!src.ownWords?.trim()) return dd;
  dd.working = { ...dd.working, ratings: src.ratings ?? {}, ownWords: src.ownWords.trim(), savedAt: now };
  dd.insightSavedAt = src.insightSaved ? now : null;
  return dd;
}

function buildStep04(src: Step03DummyFile['step04'], focusDomainId: MandalaDomainId | null): Step04Store {
  if (!focusDomainId) return { version: 1, activeDomainId: null, themeOrder: [], themes: {} };
  const reasons: ReasonEntry[] = src.reasons.map((r) => ({
    id: createReasonId(),
    text: r.text,
    origin: 'initial',
    changeability: r.changeability,
    tags: { ...emptyLayerTags(), ...r.tags },
    otherText: { ...emptyLayerOtherText(), ...r.otherText },
  }));
  const deepDive: Record<string, DeepDiveEntry> = {};
  src.reasons.forEach((r, i) => {
    if (r.deepDive) deepDive[reasons[i].id] = buildDeepDive(focusDomainId, reasons[i], r.deepDive);
  });
  return {
    version: 1,
    activeDomainId: focusDomainId,
    themeOrder: [focusDomainId],
    themes: {
      [focusDomainId]: { domainId: focusDomainId, reasons, startedAt: Date.now(), completedAt: null, deepDive },
    },
  };
}

export async function loadStep03DummyBundle(path: string): Promise<Step03DummyBundle> {
  const file = await fetchJson<Step03DummyFile>(path);
  const persona = await fetchJson<DummyPersonaFile>(file.step01Source);
  const step03 = buildStep03(file.step03);
  return {
    personaName: file.persona.name,
    step01: buildStep01(persona),
    step03,
    step04: buildStep04(file.step04, step03.focusDomainId),
  };
}

/** Step4 画面はマウント時に localStorage から復元するため直接書き込む */
export function writeStep04DummyStore(store: Step04Store): void {
  window.localStorage.setItem(STEP04_STORAGE_KEY, JSON.stringify(store));
}
