'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MANDALA_DOMAINS,
  type MandalaDomainId,
} from '@/lib/startProgram/mandalaConstants';
import {
  STEP03_RADAR_NOTE_MAX_CHARS,
  STEP03_SATISFACTION_STORAGE_KEY,
  emptyFocusCriteria,
  emptyRadarNotes,
  emptyStep03Domains,
  emptyStep03Store,
  isValidSatisfactionScore,
  type DomainSatisfaction,
  type FocusCriteria,
  type RadarNotes,
  type Step03SatisfactionStore,
} from '@/lib/startProgram/step03Constants';
import { readStep03CandidateMax } from '@/lib/startProgram/appSettings';

function clampNote(s: string): string {
  const chars = [...s];
  if (chars.length <= STEP03_RADAR_NOTE_MAX_CHARS) return s;
  return chars.slice(0, STEP03_RADAR_NOTE_MAX_CHARS).join('');
}

function normalizeDomain(raw: unknown): DomainSatisfaction {
  if (!raw || typeof raw !== 'object') return { score: null };
  const o = raw as Record<string, unknown>;
  const score =
    o.score === null || o.score === undefined
      ? null
      : isValidSatisfactionScore(o.score)
        ? o.score
        : null;
  return { score };
}

function normalizeRadarNotes(raw: unknown): RadarNotes {
  const empty = emptyRadarNotes();
  if (!raw || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  return {
    bulge: typeof o.bulge === 'string' ? clampNote(o.bulge) : '',
    imbalance: typeof o.imbalance === 'string' ? clampNote(o.imbalance) : '',
    lighten: typeof o.lighten === 'string' ? clampNote(o.lighten) : '',
  };
}

function normalizeCriteria(raw: unknown): FocusCriteria {
  const empty = emptyFocusCriteria();
  if (!raw || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  return {
    importance: isValidSatisfactionScore(o.importance) ? o.importance : null,
    excitement: isValidSatisfactionScore(o.excitement) ? o.excitement : null,
    feasibility: isValidSatisfactionScore(o.feasibility) ? o.feasibility : null,
  };
}

function isDomainId(v: unknown): v is MandalaDomainId {
  return typeof v === 'string' && MANDALA_DOMAINS.some((d) => d.id === v);
}

function readStore(): Step03SatisfactionStore {
  const empty = emptyStep03Store();
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STEP03_SATISFACTION_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const base = emptyStep03Domains();
    const incoming =
      parsed.domains && typeof parsed.domains === 'object'
        ? (parsed.domains as Record<string, unknown>)
        : {};
    for (const id of Object.keys(base) as MandalaDomainId[]) {
      base[id] = normalizeDomain(incoming[id]);
    }

    const candidatesRaw = Array.isArray(parsed.candidateDomainIds)
      ? parsed.candidateDomainIds
      : [];
    const candidateDomainIds = candidatesRaw
      .filter(isDomainId)
      .slice(0, readStep03CandidateMax());

    const criteriaRaw =
      parsed.criteriaByDomain && typeof parsed.criteriaByDomain === 'object'
        ? (parsed.criteriaByDomain as Record<string, unknown>)
        : {};
    const criteriaByDomain: Partial<Record<MandalaDomainId, FocusCriteria>> = {};
    for (const id of Object.keys(criteriaRaw) as MandalaDomainId[]) {
      if (!isDomainId(id)) continue;
      criteriaByDomain[id] = normalizeCriteria(criteriaRaw[id]);
    }

    const focusDomainId = isDomainId(parsed.focusDomainId) ? parsed.focusDomainId : null;

    return {
      version: 2,
      domains: base,
      radarNotes: normalizeRadarNotes(parsed.radarNotes),
      candidateDomainIds,
      criteriaByDomain,
      focusDomainId,
    };
  } catch {
    return empty;
  }
}

function writeStore(next: Step03SatisfactionStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STEP03_SATISFACTION_STORAGE_KEY, JSON.stringify(next));
}

/** Step3 — localStorage（v2） */
export function useStep03SatisfactionStore() {
  const [store, setStore] = useState<Step03SatisfactionStore>(() => readStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Step03SatisfactionStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  const setScore = useCallback((domainId: MandalaDomainId, score: number | null) => {
    setStore((prev) => {
      const nextScore =
        score === null || isValidSatisfactionScore(score) ? score : prev.domains[domainId]?.score ?? null;
      const next: Step03SatisfactionStore = {
        ...prev,
        domains: {
          ...prev.domains,
          [domainId]: { score: nextScore },
        },
      };
      writeStore(next);
      return next;
    });
  }, []);

  const setRadarNotes = useCallback((patch: Partial<RadarNotes>) => {
    setStore((prev) => {
      const next: Step03SatisfactionStore = {
        ...prev,
        radarNotes: {
          bulge: patch.bulge !== undefined ? clampNote(patch.bulge) : prev.radarNotes.bulge,
          imbalance:
            patch.imbalance !== undefined
              ? clampNote(patch.imbalance)
              : prev.radarNotes.imbalance,
          lighten:
            patch.lighten !== undefined ? clampNote(patch.lighten) : prev.radarNotes.lighten,
        },
      };
      writeStore(next);
      return next;
    });
  }, []);

  const setCandidateDomainIds = useCallback((ids: MandalaDomainId[]) => {
    setStore((prev) => {
      const unique = [...new Set(ids.filter(isDomainId))].slice(
        0,
        readStep03CandidateMax()
      );
      const criteriaByDomain: Partial<Record<MandalaDomainId, FocusCriteria>> = {};
      for (const id of unique) {
        criteriaByDomain[id] = prev.criteriaByDomain[id] ?? emptyFocusCriteria();
      }
      const focusDomainId =
        prev.focusDomainId && unique.includes(prev.focusDomainId) ? prev.focusDomainId : null;
      const next: Step03SatisfactionStore = {
        ...prev,
        candidateDomainIds: unique,
        criteriaByDomain,
        focusDomainId,
      };
      writeStore(next);
      return next;
    });
  }, []);

  const setCriteria = useCallback(
    (domainId: MandalaDomainId, patch: Partial<FocusCriteria>) => {
      setStore((prev) => {
        if (!prev.candidateDomainIds.includes(domainId)) return prev;
        const cur = prev.criteriaByDomain[domainId] ?? emptyFocusCriteria();
        const nextCrit: FocusCriteria = {
          importance:
            patch.importance === undefined
              ? cur.importance
              : patch.importance === null || isValidSatisfactionScore(patch.importance)
                ? patch.importance
                : cur.importance,
          excitement:
            patch.excitement === undefined
              ? cur.excitement
              : patch.excitement === null || isValidSatisfactionScore(patch.excitement)
                ? patch.excitement
                : cur.excitement,
          feasibility:
            patch.feasibility === undefined
              ? cur.feasibility
              : patch.feasibility === null || isValidSatisfactionScore(patch.feasibility)
                ? patch.feasibility
                : cur.feasibility,
        };
        const next: Step03SatisfactionStore = {
          ...prev,
          criteriaByDomain: { ...prev.criteriaByDomain, [domainId]: nextCrit },
        };
        writeStore(next);
        return next;
      });
    },
    []
  );

  const setFocusDomainId = useCallback((id: MandalaDomainId | null) => {
    setStore((prev) => {
      if (id != null && !prev.candidateDomainIds.includes(id)) return prev;
      const next: Step03SatisfactionStore = { ...prev, focusDomainId: id };
      writeStore(next);
      return next;
    });
  }, []);

  return {
    store,
    hydrated,
    persist,
    setScore,
    setRadarNotes,
    setCandidateDomainIds,
    setCriteria,
    setFocusDomainId,
  };
}
