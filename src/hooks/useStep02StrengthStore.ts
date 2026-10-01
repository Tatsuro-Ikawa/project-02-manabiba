'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type GroupColorId,
  type GroupSubStep,
  type InterestGroup,
  type InterestGroupsByColor,
  type InterestTagColors,
} from '@/lib/startProgram/step02Constants';
import {
  STRENGTH_STORAGE_KEY,
  defaultStrengthStore,
  emptyStrengthEpisode,
  emptyStrengthSentence,
  ensureStrengthSentencesFromGroups,
  type Step02StrengthStore,
  type StrengthEpisode,
  type StrengthEpisodeKind,
  type StrengthKeySentence,
  type StrengthOption,
  type StrengthOptionsByWish,
  type StrengthPhase,
} from '@/lib/startProgram/step02StrengthConstants';

const COLOR_HISTORY_MAX = 30;
const STRENGTH_SYNC_EVENT = 'manabiba:step02-strength-sync';

function normalizeEpisodes(list: StrengthEpisode[] | undefined): StrengthEpisode[] {
  if (!list?.length) {
    return [emptyStrengthEpisode('praise'), emptyStrengthEpisode('natural')];
  }
  return list.map((e) => ({
    ...e,
    kind: e.kind === 'natural' ? 'natural' : 'praise',
    options: e.options ?? [],
  }));
}

function readStore(): Step02StrengthStore {
  if (typeof window === 'undefined') return defaultStrengthStore();
  try {
    const raw = window.localStorage.getItem(STRENGTH_STORAGE_KEY);
    if (!raw) return defaultStrengthStore();
    const parsed = JSON.parse(raw) as Partial<Step02StrengthStore>;
    const base = defaultStrengthStore();
    return {
      ...base,
      ...parsed,
      optionsByWish: parsed.optionsByWish ?? {},
      episodes: normalizeEpisodes(parsed.episodes),
      tagColors: parsed.tagColors ?? {},
      groups: parsed.groups ?? {},
      sentences: parsed.sentences ?? {},
      colorHistory: parsed.colorHistory ?? [],
      ui: { ...base.ui, ...parsed.ui },
    };
  } catch {
    return defaultStrengthStore();
  }
}

function writeStore(next: Step02StrengthStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STRENGTH_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(STRENGTH_SYNC_EVENT));
}

function collectSelectedOptions(
  optionsByWish: StrengthOptionsByWish,
  episodes: StrengthEpisode[]
): StrengthOption[] {
  const list: StrengthOption[] = [];
  for (const opts of Object.values(optionsByWish)) {
    for (const o of opts) if (o.selected) list.push(o);
  }
  for (const ep of episodes) {
    for (const o of ep.options) if (o.selected) list.push(o);
  }
  return list;
}

function collectSelectedIds(
  optionsByWish: StrengthOptionsByWish,
  episodes: StrengthEpisode[]
): Set<string> {
  return new Set(collectSelectedOptions(optionsByWish, episodes).map((o) => o.id));
}

function pruneColors(
  tagColors: InterestTagColors,
  selectedIds: Set<string>
): InterestTagColors {
  const next: InterestTagColors = {};
  for (const [id, color] of Object.entries(tagColors)) {
    if (selectedIds.has(id)) next[id] = color;
  }
  return next;
}

export function useStep02StrengthStore() {
  const [store, setStore] = useState<Step02StrengthStore>(() => defaultStrengthStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
    const sync = () => setStore(readStore());
    window.addEventListener(STRENGTH_SYNC_EVENT, sync);
    return () => window.removeEventListener(STRENGTH_SYNC_EVENT, sync);
  }, []);

  const persist = useCallback((next: Step02StrengthStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  const update = useCallback((fn: (prev: Step02StrengthStore) => Step02StrengthStore) => {
    setStore((prev) => {
      const next = fn(prev);
      writeStore(next);
      return next;
    });
  }, []);

  const setPhase = useCallback(
    (phase: StrengthPhase) => {
      update((prev) => ({ ...prev, ui: { ...prev.ui, phase } }));
    },
    [update]
  );

  const setGroupSubStep = useCallback(
    (groupSubStep: GroupSubStep) => {
      update((prev) => ({ ...prev, ui: { ...prev.ui, groupSubStep } }));
    },
    [update]
  );

  const setOpenWishId = useCallback(
    (openWishId: string | null) => {
      update((prev) => ({
        ...prev,
        ui: { ...prev.ui, openWishId, openEpisodeId: null },
      }));
    },
    [update]
  );

  const setOpenEpisodeId = useCallback(
    (openEpisodeId: string | null) => {
      update((prev) => ({
        ...prev,
        ui: { ...prev.ui, openEpisodeId, openWishId: null },
      }));
    },
    [update]
  );

  const setWishOptions = useCallback(
    (wishEntryId: string, options: StrengthOption[]) => {
      update((prev) => {
        const optionsByWish: StrengthOptionsByWish = {
          ...prev.optionsByWish,
          [wishEntryId]: options,
        };
        const selectedIds = collectSelectedIds(optionsByWish, prev.episodes);
        return {
          ...prev,
          optionsByWish,
          tagColors: pruneColors(prev.tagColors, selectedIds),
        };
      });
    },
    [update]
  );

  const setEpisode = useCallback(
    (episode: StrengthEpisode) => {
      update((prev) => {
        const episodes = prev.episodes.map((e) => (e.id === episode.id ? episode : e));
        const selectedIds = collectSelectedIds(prev.optionsByWish, episodes);
        return {
          ...prev,
          episodes,
          tagColors: pruneColors(prev.tagColors, selectedIds),
        };
      });
    },
    [update]
  );

  const addEpisode = useCallback((kind: StrengthEpisodeKind) => {
    update((prev) => ({
      ...prev,
      episodes: [...prev.episodes, emptyStrengthEpisode(kind)],
    }));
  }, [update]);

  const removeEpisode = useCallback(
    (episodeId: string) => {
      update((prev) => {
        const target = prev.episodes.find((e) => e.id === episodeId);
        if (!target) return prev;
        const sameKind = prev.episodes.filter((e) => e.kind === target.kind);
        let episodes: StrengthEpisode[];
        if (sameKind.length <= 1) {
          episodes = prev.episodes.map((e) =>
            e.id === episodeId ? emptyStrengthEpisode(target.kind) : e
          );
        } else {
          episodes = prev.episodes.filter((e) => e.id !== episodeId);
        }
        const selectedIds = collectSelectedIds(prev.optionsByWish, episodes);
        return {
          ...prev,
          episodes,
          tagColors: pruneColors(prev.tagColors, selectedIds),
          ui: {
            ...prev.ui,
            openEpisodeId:
              prev.ui.openEpisodeId === episodeId ? null : prev.ui.openEpisodeId,
          },
        };
      });
    },
    [update]
  );

  const setSelectedTagIds = useCallback(
    (selectedTagIds: string[]) => {
      update((prev) => ({ ...prev, ui: { ...prev.ui, selectedTagIds } }));
    },
    [update]
  );

  const setActiveColorId = useCallback(
    (activeColorId: Exclude<GroupColorId, 'other'> | null) => {
      update((prev) => ({ ...prev, ui: { ...prev.ui, activeColorId } }));
    },
    [update]
  );

  const applyColorToSelected = useCallback(
    (colorId: Exclude<GroupColorId, 'other'>) => {
      update((prev) => {
        const ids = prev.ui.selectedTagIds;
        if (ids.length === 0) return prev;
        const history = [...prev.colorHistory, { ...prev.tagColors }].slice(
          -COLOR_HISTORY_MAX
        );
        const tagColors = { ...prev.tagColors };
        for (const id of ids) tagColors[id] = colorId;
        return {
          ...prev,
          tagColors,
          colorHistory: history,
          ui: { ...prev.ui, selectedTagIds: [], activeColorId: colorId },
        };
      });
    },
    [update]
  );

  const clearColorFromSelected = useCallback(() => {
    update((prev) => {
      const ids = prev.ui.selectedTagIds;
      if (ids.length === 0) return prev;
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(
        -COLOR_HISTORY_MAX
      );
      const tagColors = { ...prev.tagColors };
      for (const id of ids) delete tagColors[id];
      return {
        ...prev,
        tagColors,
        colorHistory: history,
        ui: { ...prev.ui, selectedTagIds: [], activeColorId: null },
      };
    });
  }, [update]);

  const undoColor = useCallback(() => {
    update((prev) => {
      if (prev.colorHistory.length === 0) return prev;
      const history = [...prev.colorHistory];
      const tagColors = history.pop() ?? {};
      return { ...prev, tagColors, colorHistory: history };
    });
  }, [update]);

  const commitColorGroups = useCallback(() => {
    update((prev) => {
      const selected = collectSelectedOptions(prev.optionsByWish, prev.episodes);
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(
        -COLOR_HISTORY_MAX
      );
      const tagColors = { ...prev.tagColors };
      for (const opt of selected) {
        if (!tagColors[opt.id]) tagColors[opt.id] = 'other';
      }
      const used = new Set<GroupColorId>();
      for (const c of Object.values(tagColors)) {
        if (c) used.add(c);
      }
      const groups: InterestGroupsByColor = { ...prev.groups };
      for (const colorId of used) {
        if (!groups[colorId]) {
          groups[colorId] = {
            colorId,
            title: colorId === 'other' ? 'その他' : '',
            comment: '',
          };
        }
      }
      for (const key of Object.keys(groups) as GroupColorId[]) {
        if (!Object.values(tagColors).includes(key)) delete groups[key];
      }
      return {
        ...prev,
        tagColors,
        groups,
        colorHistory: history,
        ui: {
          ...prev.ui,
          phase: 'group',
          groupSubStep: 'name',
          selectedTagIds: [],
        },
      };
    });
  }, [update]);

  const setGroupMeta = useCallback(
    (colorId: GroupColorId, patch: Partial<Pick<InterestGroup, 'title' | 'comment'>>) => {
      update((prev) => {
        const current = prev.groups[colorId] ?? {
          colorId,
          title: colorId === 'other' ? 'その他' : '',
          comment: '',
        };
        return {
          ...prev,
          groups: { ...prev.groups, [colorId]: { ...current, ...patch } },
        };
      });
    },
    [update]
  );

  const moveTagToColor = useCallback((tagId: string, colorId: GroupColorId) => {
    update((prev) => {
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(
        -COLOR_HISTORY_MAX
      );
      const tagColors = { ...prev.tagColors, [tagId]: colorId };
      const groups: InterestGroupsByColor = { ...prev.groups };
      if (!groups[colorId]) {
        groups[colorId] = {
          colorId,
          title: colorId === 'other' ? 'その他' : '',
          comment: '',
        };
      }
      return { ...prev, tagColors, groups, colorHistory: history };
    });
  }, [update]);

  const ensureSentences = useCallback(() => {
    update((prev) => ({
      ...prev,
      sentences: ensureStrengthSentencesFromGroups(
        prev.tagColors,
        prev.groups,
        prev.sentences
      ),
    }));
  }, [update]);

  const setSentence = useCallback(
    (
      colorId: GroupColorId,
      patch: Partial<Omit<StrengthKeySentence, 'groupColorId'>>
    ) => {
      update((prev) => {
        const current =
          prev.sentences[colorId] ??
          emptyStrengthSentence(colorId, prev.groups[colorId]?.title?.trim() ?? '');
        return {
          ...prev,
          sentences: {
            ...prev.sentences,
            [colorId]: { ...current, ...patch, groupColorId: colorId },
          },
        };
      });
    },
    [update]
  );

  const replaceAll = useCallback(
    (next: Step02StrengthStore) => {
      persist({
        ...defaultStrengthStore(),
        ...next,
        episodes: normalizeEpisodes(next.episodes),
        ui: { ...defaultStrengthStore().ui, ...next.ui },
      });
    },
    [persist]
  );

  return {
    store,
    hydrated,
    setPhase,
    setGroupSubStep,
    setOpenWishId,
    setOpenEpisodeId,
    setWishOptions,
    setEpisode,
    addEpisode,
    removeEpisode,
    setSelectedTagIds,
    setActiveColorId,
    applyColorToSelected,
    clearColorFromSelected,
    undoColor,
    commitColorGroups,
    setGroupMeta,
    moveTagToColor,
    ensureSentences,
    setSentence,
    replaceAll,
  };
}
