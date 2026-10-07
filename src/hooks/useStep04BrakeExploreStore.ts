'use client';

import { useCallback, useEffect, useState } from 'react';
import { MANDALA_DOMAINS, type MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import {
  STEP04_OTHER_MAX_CHARS,
  STEP04_REASON_MAX_CHARS,
  STEP04_STORAGE_KEY,
  createReasonId,
  emptyLayerOtherText,
  emptyLayerTags,
  emptyStep04Store,
  getLayerOption,
  isActionableChangeability,
  type Changeability,
  type LayerKey,
  type LayerTagId,
  type ReasonEntry,
  type ReasonOrigin,
  type Step04Store,
  type Step04Theme,
} from '@/lib/startProgram/step04Constants';
import {
  WORKING_RATINGS,
  emptyAiSlot,
  emptyDeepDiveEntry,
  type AiSlot,
  type DeepDiveEntry,
  type EntryOptions,
  type Hypothesis,
  type InnerOptions,
  type PickAnswer,
  type WorkingRating,
} from '@/lib/startProgram/step04DeepDiveConstants';

const CHANGEABILITIES: Changeability[] = ['can_change', 'can_influence', 'hard_now', 'unsure'];
const LAYER_KEYS: LayerKey[] = ['have', 'do', 'be'];

function isDomainId(v: unknown): v is MandalaDomainId {
  return typeof v === 'string' && MANDALA_DOMAINS.some((d) => d.id === v);
}

function clip(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max).join('');
}

function normalizeReason(raw: unknown): ReasonEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;
  const tagsRaw = (o.tags && typeof o.tags === 'object' ? o.tags : {}) as Record<string, unknown>;
  const otherRaw = (o.otherText && typeof o.otherText === 'object' ? o.otherText : {}) as Record<
    string,
    unknown
  >;
  const tags = emptyLayerTags();
  const otherText = emptyLayerOtherText();
  for (const key of LAYER_KEYS) {
    const list = Array.isArray(tagsRaw[key]) ? (tagsRaw[key] as unknown[]) : [];
    tags[key] = list.filter(
      (t): t is LayerTagId => typeof t === 'string' && getLayerOption(t as LayerTagId)?.layer.key === key
    );
    otherText[key] = clip(otherRaw[key], STEP04_OTHER_MAX_CHARS);
  }
  const changeability = CHANGEABILITIES.includes(o.changeability as Changeability)
    ? (o.changeability as Changeability)
    : null;
  return {
    id: o.id,
    text: clip(o.text, STEP04_REASON_MAX_CHARS),
    origin: o.origin === 'rescue' ? 'rescue' : 'initial',
    changeability,
    tags,
    otherText,
  };
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function normalizePick(raw: unknown): PickAnswer {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return { selected: strList(o.selected), custom: strList(o.custom) };
}

/** 生成中のまま保存された枠は、再訪時に作り直す */
function normalizeSlot<T>(raw: unknown, normalizeData: (d: unknown) => T | null): AiSlot<T> {
  const empty = emptyAiSlot<T>();
  if (!raw || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  const data = o.data == null ? null : normalizeData(o.data);
  const status = o.status === 'ready' && data ? 'ready' : o.status === 'error' ? 'error' : 'idle';
  return {
    status,
    data,
    inputKey: status === 'idle' ? null : typeof o.inputKey === 'string' ? o.inputKey : null,
    refreshCount: typeof o.refreshCount === 'number' ? o.refreshCount : 0,
    refreshedNotice: o.refreshedNotice === true,
  };
}

function savedAt(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

function normalizeDeepDive(reasonId: string, raw: unknown): DeepDiveEntry {
  const base = emptyDeepDiveEntry(reasonId);
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, Record<string, unknown> | undefined>;
  const e = o.entry ?? {};
  const n = o.inner ?? {};
  const w = o.working ?? {};
  const ratingsRaw = (w.ratings && typeof w.ratings === 'object' ? w.ratings : {}) as Record<string, unknown>;
  const ratings: Record<string, WorkingRating> = {};
  for (const [k, v] of Object.entries(ratingsRaw)) {
    if (WORKING_RATINGS.some((r) => r.id === v)) ratings[k] = v as WorkingRating;
  }
  return {
    reasonId,
    entry: {
      options: normalizeSlot<EntryOptions>(e.options, (d) => {
        const x = d as Record<string, unknown>;
        return typeof x.sceneQuestion === 'string'
          ? { sceneQuestion: x.sceneQuestion, scenes: strList(x.scenes), actions: strList(x.actions) }
          : null;
      }),
      scene: normalizePick(e.scene),
      action: normalizePick(e.action),
      savedAt: savedAt(e.savedAt),
    },
    inner: {
      options: normalizeSlot<InnerOptions>(n.options, (d) => {
        const x = d as Record<string, unknown>;
        return { feelings: strList(x.feelings), voices: strList(x.voices), protections: strList(x.protections) };
      }),
      feeling: normalizePick(n.feeling),
      voice: normalizePick(n.voice),
      voiceOwnWords: typeof n.voiceOwnWords === 'string' ? n.voiceOwnWords : '',
      protection: normalizePick(n.protection),
      savedAt: savedAt(n.savedAt),
    },
    working: {
      hypotheses: normalizeSlot<Hypothesis[]>(w.hypotheses, (d) =>
        Array.isArray(d)
          ? d
              .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
              .filter((h) => typeof h.id === 'string' && typeof h.title === 'string')
              .map((h) => ({
                id: h.id as string,
                title: h.title as string,
                body: typeof h.body === 'string' ? h.body : '',
                links: strList(h.links),
              }))
          : null
      ),
      ratings,
      ownWords: typeof w.ownWords === 'string' ? w.ownWords : '',
      savedAt: savedAt(w.savedAt),
    },
    insightSavedAt: savedAt((o as Record<string, unknown>).insightSavedAt),
  };
}

function normalizeTheme(domainId: MandalaDomainId, raw: unknown): Step04Theme | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const reasons = (Array.isArray(o.reasons) ? o.reasons : [])
    .map(normalizeReason)
    .filter((r): r is ReasonEntry => r != null);
  const ddRaw = (o.deepDive && typeof o.deepDive === 'object' ? o.deepDive : {}) as Record<string, unknown>;
  const deepDive: Record<string, DeepDiveEntry> = {};
  for (const r of reasons) {
    if (ddRaw[r.id]) deepDive[r.id] = normalizeDeepDive(r.id, ddRaw[r.id]);
  }
  return {
    domainId,
    reasons,
    startedAt: typeof o.startedAt === 'number' ? o.startedAt : Date.now(),
    completedAt: typeof o.completedAt === 'number' ? o.completedAt : null,
    deepDive,
  };
}

function readStore(): Step04Store {
  const empty = emptyStep04Store();
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STEP04_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const themesRaw =
      parsed.themes && typeof parsed.themes === 'object'
        ? (parsed.themes as Record<string, unknown>)
        : {};
    const themes: Step04Store['themes'] = {};
    for (const key of Object.keys(themesRaw)) {
      if (!isDomainId(key)) continue;
      const theme = normalizeTheme(key, themesRaw[key]);
      if (theme) themes[key] = theme;
    }
    const orderRaw = Array.isArray(parsed.themeOrder) ? parsed.themeOrder : [];
    const themeOrder = [...new Set(orderRaw.filter(isDomainId))].filter((id) => themes[id]);
    for (const id of Object.keys(themes) as MandalaDomainId[]) {
      if (!themeOrder.includes(id)) themeOrder.push(id);
    }
    const activeDomainId =
      isDomainId(parsed.activeDomainId) && themes[parsed.activeDomainId]
        ? parsed.activeDomainId
        : null;
    return { version: 1, activeDomainId, themeOrder, themes };
  } catch {
    return empty;
  }
}

function writeStore(next: Step04Store) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STEP04_STORAGE_KEY, JSON.stringify(next));
}

function newReason(text: string, origin: ReasonOrigin, changeability: Changeability | null): ReasonEntry {
  return {
    id: createReasonId(),
    text: clip(text.trim(), STEP04_REASON_MAX_CHARS),
    origin,
    changeability,
    tags: emptyLayerTags(),
    otherText: emptyLayerOtherText(),
  };
}

/** Step4 — localStorage（v1）。テーマ（領域）ごとにセッションを持つ */
export function useStep04BrakeExploreStore() {
  const [store, setStore] = useState<Step04Store>(() => emptyStep04Store());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const update = useCallback((fn: (prev: Step04Store) => Step04Store) => {
    setStore((prev) => {
      const next = fn(prev);
      if (next !== prev) writeStore(next);
      return next;
    });
  }, []);

  const updateActiveTheme = useCallback(
    (fn: (theme: Step04Theme) => Step04Theme) => {
      update((prev) => {
        const id = prev.activeDomainId;
        const theme = id ? prev.themes[id] : undefined;
        if (!id || !theme) return prev;
        const nextTheme = fn(theme);
        if (nextTheme === theme) return prev;
        return { ...prev, themes: { ...prev.themes, [id]: nextTheme } };
      });
    },
    [update]
  );

  /** テーマを開始（既存なら再開）してアクティブにする */
  const startTheme = useCallback(
    (domainId: MandalaDomainId) => {
      update((prev) => {
        const exists = prev.themes[domainId];
        return {
          ...prev,
          activeDomainId: domainId,
          themeOrder: exists ? prev.themeOrder : [...prev.themeOrder, domainId],
          themes: exists
            ? prev.themes
            : {
                ...prev.themes,
                [domainId]: { domainId, reasons: [], startedAt: Date.now(), completedAt: null, deepDive: {} },
              },
        };
      });
    },
    [update]
  );

  const removeTheme = useCallback(
    (domainId: MandalaDomainId) => {
      update((prev) => {
        if (!prev.themes[domainId]) return prev;
        const themes = { ...prev.themes };
        delete themes[domainId];
        return {
          ...prev,
          activeDomainId: prev.activeDomainId === domainId ? null : prev.activeDomainId,
          themeOrder: prev.themeOrder.filter((id) => id !== domainId),
          themes,
        };
      });
    },
    [update]
  );

  const addReason = useCallback(
    (text: string, origin: ReasonOrigin = 'initial', changeability: Changeability | null = null) => {
      if (!text.trim()) return;
      updateActiveTheme((t) => ({
        ...t,
        completedAt: null,
        reasons: [...t.reasons, newReason(text, origin, changeability)],
      }));
    },
    [updateActiveTheme]
  );

  const updateReasonText = useCallback(
    (id: string, text: string) => {
      updateActiveTheme((t) => ({
        ...t,
        reasons: t.reasons.map((r) =>
          r.id === id ? { ...r, text: clip(text, STEP04_REASON_MAX_CHARS) } : r
        ),
      }));
    },
    [updateActiveTheme]
  );

  const removeReason = useCallback(
    (id: string) => {
      updateActiveTheme((t) => {
        const deepDive = { ...t.deepDive };
        delete deepDive[id];
        return { ...t, completedAt: null, reasons: t.reasons.filter((r) => r.id !== id), deepDive };
      });
    },
    [updateActiveTheme]
  );

  const setChangeability = useCallback(
    (id: string, c: Changeability) => {
      updateActiveTheme((t) => ({
        ...t,
        completedAt: null,
        reasons: t.reasons.map((r) => {
          if (r.id !== id) return r;
          // ③④に変えた理由の Have/Do/Be は残しておく（①②に戻したとき復元できる）
          return { ...r, changeability: c };
        }),
      }));
    },
    [updateActiveTheme]
  );

  const toggleLayerTag = useCallback(
    (id: string, layer: LayerKey, tag: LayerTagId) => {
      updateActiveTheme((t) => ({
        ...t,
        completedAt: null,
        reasons: t.reasons.map((r) => {
          if (r.id !== id || !isActionableChangeability(r.changeability)) return r;
          const cur = r.tags[layer];
          const nextTags = cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag];
          return { ...r, tags: { ...r.tags, [layer]: nextTags } };
        }),
      }));
    },
    [updateActiveTheme]
  );

  const setLayerOtherText = useCallback(
    (id: string, layer: LayerKey, text: string) => {
      updateActiveTheme((t) => ({
        ...t,
        reasons: t.reasons.map((r) =>
          r.id === id
            ? { ...r, otherText: { ...r.otherText, [layer]: clip(text, STEP04_OTHER_MAX_CHARS) } }
            : r
        ),
      }));
    },
    [updateActiveTheme]
  );

  /** AI の応答は非同期で戻るため、テーマを明示して更新する */
  const patchDeepDive = useCallback(
    (domainId: MandalaDomainId, reasonId: string, fn: (e: DeepDiveEntry) => DeepDiveEntry) => {
      update((prev) => {
        const theme = prev.themes[domainId];
        if (!theme || !theme.reasons.some((r) => r.id === reasonId)) return prev;
        const cur = theme.deepDive[reasonId] ?? emptyDeepDiveEntry(reasonId);
        const next = fn(cur);
        if (next === cur) return prev;
        return {
          ...prev,
          themes: { ...prev.themes, [domainId]: { ...theme, deepDive: { ...theme.deepDive, [reasonId]: next } } },
        };
      });
    },
    [update]
  );

  const activeTheme = store.activeDomainId ? store.themes[store.activeDomainId] : undefined;

  return {
    store,
    hydrated,
    activeTheme,
    startTheme,
    removeTheme,
    addReason,
    updateReasonText,
    removeReason,
    setChangeability,
    toggleLayerTag,
    setLayerOtherText,
    patchDeepDive,
  };
}
