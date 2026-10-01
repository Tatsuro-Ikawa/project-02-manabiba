'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  STEP02_INTEREST_STORAGE_KEY,
  defaultInterestStore,
  type GroupColorId,
  type GroupSubStep,
  type InterestGroup,
  type InterestGroupsByColor,
  type InterestOption,
  type InterestOptionsByWish,
  type InterestPhase,
  type InterestTagColors,
  type KeySentence,
  type KeySentencesByColor,
  type Step02InterestStore,
  type Step02Lane,
  emptyKeySentence,
  orderedUsedColorIds,
} from '@/lib/startProgram/step02Constants';

const COLOR_HISTORY_MAX = 30;

function readStore(): Step02InterestStore {
  if (typeof window === 'undefined') return defaultInterestStore();
  try {
    const raw = window.localStorage.getItem(STEP02_INTEREST_STORAGE_KEY);
    if (!raw) return defaultInterestStore();
    const parsed = JSON.parse(raw) as Partial<Step02InterestStore>;
    const base = defaultInterestStore();
    return {
      ...base,
      ...parsed,
      optionsByWish: parsed.optionsByWish ?? {},
      tagColors: parsed.tagColors ?? {},
      groups: parsed.groups ?? {},
      sentences: parsed.sentences ?? {},
      colorHistory: parsed.colorHistory ?? [],
      ui: { ...base.ui, ...parsed.ui },
    };
  } catch {
    return defaultInterestStore();
  }
}

function writeStore(next: Step02InterestStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STEP02_INTEREST_STORAGE_KEY, JSON.stringify(next));
}

/** Step2 興味レーン — localStorage（Firestore 前） */
export function useStep02InterestStore() {
  const [store, setStore] = useState<Step02InterestStore>(() => defaultInterestStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Step02InterestStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  const update = useCallback((fn: (prev: Step02InterestStore) => Step02InterestStore) => {
    setStore((prev) => {
      const next = fn(prev);
      writeStore(next);
      return next;
    });
  }, []);

  const setLane = useCallback((lane: Step02Lane | null) => {
    update((prev) => ({
      ...prev,
      ui: { ...prev.ui, lane, phase: 'dig', groupSubStep: 'color' },
    }));
  }, [update]);

  const setPhase = useCallback((phase: InterestPhase) => {
    update((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        phase,
        groupSubStep: phase === 'group' ? prev.ui.groupSubStep || 'color' : prev.ui.groupSubStep,
      },
    }));
  }, [update]);

  const setGroupSubStep = useCallback((groupSubStep: GroupSubStep) => {
    update((prev) => ({ ...prev, ui: { ...prev.ui, groupSubStep } }));
  }, [update]);

  const setOpenWishId = useCallback((openWishId: string | null) => {
    update((prev) => ({ ...prev, ui: { ...prev.ui, openWishId } }));
  }, [update]);

  const setWishOptions = useCallback((wishEntryId: string, options: InterestOption[]) => {
    update((prev) => {
      const optionsByWish: InterestOptionsByWish = {
        ...prev.optionsByWish,
        [wishEntryId]: options,
      };
      // 選択解除された option の色を掃除
      const selectedIds = new Set(
        Object.values(optionsByWish)
          .flat()
          .filter((o) => o.selected)
          .map((o) => o.id)
      );
      const tagColors: InterestTagColors = {};
      for (const [id, color] of Object.entries(prev.tagColors)) {
        if (selectedIds.has(id)) tagColors[id] = color;
      }
      return { ...prev, optionsByWish, tagColors };
    });
  }, [update]);

  const setSelectedTagIds = useCallback((selectedTagIds: string[]) => {
    update((prev) => ({ ...prev, ui: { ...prev.ui, selectedTagIds } }));
  }, [update]);

  const setActiveColorId = useCallback(
    (activeColorId: Exclude<GroupColorId, 'other'> | null) => {
      update((prev) => ({ ...prev, ui: { ...prev.ui, activeColorId } }));
    },
    [update]
  );

  const applyColorToSelected = useCallback((colorId: Exclude<GroupColorId, 'other'>) => {
    update((prev) => {
      const ids = prev.ui.selectedTagIds;
      if (ids.length === 0) return prev;
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(-COLOR_HISTORY_MAX);
      const tagColors = { ...prev.tagColors };
      for (const id of ids) {
        tagColors[id] = colorId;
      }
      return {
        ...prev,
        tagColors,
        colorHistory: history,
        ui: { ...prev.ui, selectedTagIds: [], activeColorId: colorId },
      };
    });
  }, [update]);

  /** 選択中ピルの色を外す（未色分けに戻す） */
  const clearColorFromSelected = useCallback(() => {
    update((prev) => {
      const ids = prev.ui.selectedTagIds;
      if (ids.length === 0) return prev;
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(-COLOR_HISTORY_MAX);
      const tagColors = { ...prev.tagColors };
      for (const id of ids) {
        delete tagColors[id];
      }
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

  /** まとめるボタン: 未色分けを other へ。グループ枠を用意して②へ */
  const commitColorGroups = useCallback(() => {
    update((prev) => {
      const selectedOpts = Object.values(prev.optionsByWish)
        .flat()
        .filter((o) => o.selected);
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(-COLOR_HISTORY_MAX);
      const tagColors = { ...prev.tagColors };
      for (const opt of selectedOpts) {
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
      // タグが無くなった色のグループは残してもよいが、空なら削除
      for (const key of Object.keys(groups) as GroupColorId[]) {
        const stillUsed = Object.values(tagColors).includes(key);
        if (!stillUsed) delete groups[key];
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
          groups: {
            ...prev.groups,
            [colorId]: { ...current, ...patch },
          },
        };
      });
    },
    [update]
  );

  const moveTagToColor = useCallback((tagId: string, colorId: GroupColorId) => {
    update((prev) => {
      const history = [...prev.colorHistory, { ...prev.tagColors }].slice(-COLOR_HISTORY_MAX);
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

  /** 文にする入場時: グループからセンテンス枠を用意（タイトル自動投入） */
  const ensureSentences = useCallback(() => {
    update((prev) => {
      const colorIds = orderedUsedColorIds(prev.tagColors);
      const sentences: KeySentencesByColor = { ...prev.sentences };
      for (const colorId of colorIds) {
        const title = prev.groups[colorId]?.title?.trim() ?? '';
        const existing = sentences[colorId];
        if (!existing) {
          sentences[colorId] = emptyKeySentence(colorId, title);
        } else if (!existing.interestPhrase.trim() && title) {
          sentences[colorId] = { ...existing, interestPhrase: title };
        }
      }
      // タグが無くなった色のセンテンスは残すが UI では出さない
      return { ...prev, sentences };
    });
  }, [update]);

  const setSentence = useCallback(
    (colorId: GroupColorId, patch: Partial<Omit<KeySentence, 'groupColorId'>>) => {
      update((prev) => {
        const current =
          prev.sentences[colorId] ??
          emptyKeySentence(colorId, prev.groups[colorId]?.title?.trim() ?? '');
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
    (next: Step02InterestStore) => {
      persist({ ...defaultInterestStore(), ...next, ui: { ...defaultInterestStore().ui, ...next.ui } });
    },
    [persist]
  );

  return {
    store,
    hydrated,
    persist,
    setLane,
    setPhase,
    setGroupSubStep,
    setOpenWishId,
    setWishOptions,
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
