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

function normalizeTheme(domainId: MandalaDomainId, raw: unknown): Step04Theme | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const reasons = (Array.isArray(o.reasons) ? o.reasons : [])
    .map(normalizeReason)
    .filter((r): r is ReasonEntry => r != null);
  return {
    domainId,
    reasons,
    startedAt: typeof o.startedAt === 'number' ? o.startedAt : Date.now(),
    completedAt: typeof o.completedAt === 'number' ? o.completedAt : null,
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
                [domainId]: { domainId, reasons: [], startedAt: Date.now(), completedAt: null },
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
      updateActiveTheme((t) => ({
        ...t,
        completedAt: null,
        reasons: t.reasons.filter((r) => r.id !== id),
      }));
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

  const setCompleted = useCallback(
    (done: boolean) => {
      updateActiveTheme((t) => ({ ...t, completedAt: done ? Date.now() : null }));
    },
    [updateActiveTheme]
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
    setCompleted,
  };
}
