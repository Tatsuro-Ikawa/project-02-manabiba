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
  VALUES_STORAGE_KEY,
  defaultValuesStore,
  emptyEpisode,
  emptyValuesSentence,
  ensureValuesSentencesFromGroups,
  type MovingEpisode,
  type Step02ValuesStore,
  type ValueOption,
  type ValuesKeySentence,
  type ValuesOptionsByWish,
  type ValuesPhase,
} from '@/lib/startProgram/step02ValuesConstants';

const COLOR_HISTORY_MAX = 30;
const VALUES_SYNC_EVENT = 'manabiba:step02-values-sync';

function readStore(): Step02ValuesStore {
  if (typeof window === 'undefined') return defaultValuesStore();
  try {
    const raw = window.localStorage.getItem(VALUES_STORAGE_KEY);
    if (!raw) return defaultValuesStore();
    const parsed = JSON.parse(raw) as Partial<Step02ValuesStore>;
    const base = defaultValuesStore();
    return {
      ...base,
      ...parsed,
      optionsByWish: parsed.optionsByWish ?? {},
      episodes: parsed.episodes?.length ? parsed.episodes : [emptyEpisode()],
      tagColors: parsed.tagColors ?? {},
      groups: parsed.groups ?? {},
      sentences: parsed.sentences ?? {},
      colorHistory: parsed.colorHistory ?? [],
      ui: { ...base.ui, ...parsed.ui },
    };
  } catch {
    return defaultValuesStore();
  }
}

function writeStore(next: Step02ValuesStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VALUES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(VALUES_SYNC_EVENT));
}

function collectSelectedOptions(
  optionsByWish: ValuesOptionsByWish,
  episodes: MovingEpisode[]
): ValueOption[] {
  const list: ValueOption[] = [];
  for (const opts of Object.values(optionsByWish)) {
    for (const o of opts) if (o.selected) list.push(o);
  }
  for (const ep of episodes) {
    for (const o of ep.options) if (o.selected) list.push(o);
  }
  return list;
}

function collectSelectedIds(
  optionsByWish: ValuesOptionsByWish,
  episodes: MovingEpisode[]
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

export function useStep02ValuesStore() {
  const [store, setStore] = useState<Step02ValuesStore>(() => defaultValuesStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
    const sync = () => setStore(readStore());
    window.addEventListener(VALUES_SYNC_EVENT, sync);
    return () => window.removeEventListener(VALUES_SYNC_EVENT, sync);
  }, []);

  const persist = useCallback((next: Step02ValuesStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  const update = useCallback((fn: (prev: Step02ValuesStore) => Step02ValuesStore) => {
    setStore((prev) => {
      const next = fn(prev);
      writeStore(next);
      return next;
    });
  }, []);

  const setPhase = useCallback(
    (phase: ValuesPhase) => {
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
    (wishEntryId: string, options: ValueOption[]) => {
      update((prev) => {
        const optionsByWish: ValuesOptionsByWish = {
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
    (episode: MovingEpisode) => {
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

  const addEpisode = useCallback(() => {
    update((prev) => ({
      ...prev,
      episodes: [...prev.episodes, emptyEpisode()],
    }));
  }, [update]);

  const removeEpisode = useCallback(
    (episodeId: string) => {
      update((prev) => {
        const filtered =
          prev.episodes.length <= 1
            ? prev.episodes
            : prev.episodes.filter((e) => e.id !== episodeId);
        const episodes = filtered.length ? filtered : [emptyEpisode()];
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

  /** 選択中ピルの色を外す（未色分けに戻す） */
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
      sentences: ensureValuesSentencesFromGroups(
        prev.tagColors,
        prev.groups,
        prev.sentences
      ),
    }));
  }, [update]);

  const setSentence = useCallback(
    (colorId: GroupColorId, patch: Partial<Omit<ValuesKeySentence, 'groupColorId'>>) => {
      update((prev) => {
        const current =
          prev.sentences[colorId] ??
          emptyValuesSentence(colorId, prev.groups[colorId]?.title?.trim() ?? '');
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
    (next: Step02ValuesStore) => {
      persist({
        ...defaultValuesStore(),
        ...next,
        ui: { ...defaultValuesStore().ui, ...next.ui },
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
