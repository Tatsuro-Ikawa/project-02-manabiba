'use client';

import { useCallback, useMemo, useState } from 'react';
import Step02InterestGroupColor from '@/components/start-program/step02/Step02InterestGroupColor';
import Step02InterestGroupName from '@/components/start-program/step02/Step02InterestGroupName';
import Step02ValuesDeepDive from '@/components/start-program/step02/Step02ValuesDeepDive';
import Step02ValuesEpisodeModal from '@/components/start-program/step02/Step02ValuesEpisodeModal';
import Step02ValuesPhaseNav from '@/components/start-program/step02/Step02ValuesPhaseNav';
import Step02ValuesSentence from '@/components/start-program/step02/Step02ValuesSentence';
import Step02ValuesWishModal from '@/components/start-program/step02/Step02ValuesWishModal';
import { useStep02ValuesStore } from '@/hooks/useStep02ValuesStore';
import {
  MANDALA_DOMAINS,
  type MandalaDomainsState,
} from '@/lib/startProgram/mandalaConstants';
import {
  countUsedColors,
  getActiveDummyPath,
  orderedUsedColorIds,
  type GroupColorId,
  type InterestTag,
  type MandalaWishRef,
} from '@/lib/startProgram/step02Constants';
import {
  VALUES_EPISODE_MIN_REQUIRED,
  countCompleteEpisodes,
  flattenSelectedValueTags,
} from '@/lib/startProgram/step02ValuesConstants';

type PersonaFile = {
  wishes: {
    id: string;
    text: string;
    motivation: string;
    valueOptions?: string[];
  }[];
  movingEpisodes?: {
    id: string;
    episode: string;
    emotion: string;
    valueOptions?: string[];
  }[];
  defaultValueOptions?: string[];
};

function collectValueWishes(domains: MandalaDomainsState): MandalaWishRef[] {
  const list: MandalaWishRef[] = [];
  for (const domain of MANDALA_DOMAINS) {
    for (const entry of domains[domain.id]) {
      if (entry.text.trim() && entry.motivation === 'values') {
        list.push({
          entryId: entry.id,
          domainId: domain.id,
          text: entry.text.trim(),
          motivation: entry.motivation,
        });
      }
    }
  }
  return list;
}

async function fetchPersona(): Promise<PersonaFile> {
  const res = await fetch(getActiveDummyPath(), { cache: 'no-store' });
  if (!res.ok) throw new Error('fetch failed');
  return (await res.json()) as PersonaFile;
}

function toInterestTags(
  tags: ReturnType<typeof flattenSelectedValueTags>
): InterestTag[] {
  return tags.map((t) => ({
    id: t.id,
    wishEntryId: t.sourceId,
    label: t.label,
    colorId: t.colorId,
  }));
}

type Props = {
  domains: MandalaDomainsState;
  onMessage: (msg: string | null) => void;
};

/** 価値観レーン（掘り下げ→まとめる→文にする） */
export default function Step02ValuesLane({ domains, onMessage }: Props) {
  const {
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
  } = useStep02ValuesStore();

  const wishes = useMemo(() => collectValueWishes(domains), [domains]);
  const selectedTags = useMemo(
    () =>
      flattenSelectedValueTags(store.optionsByWish, store.episodes, store.tagColors),
    [store.optionsByWish, store.episodes, store.tagColors]
  );
  const interestStyleTags = useMemo(() => toInterestTags(selectedTags), [selectedTags]);

  const wishDigDoneCount = wishes.filter((w) =>
    (store.optionsByWish[w.entryId] ?? []).some((o) => o.selected)
  ).length;
  const wishDigDone = wishes.length === 0 || wishDigDoneCount === wishes.length;
  const episodeDone = countCompleteEpisodes(store.episodes);
  const digDone = wishDigDone && episodeDone >= VALUES_EPISODE_MIN_REQUIRED;

  const groupReady = selectedTags.length > 0 && episodeDone >= VALUES_EPISODE_MIN_REQUIRED;
  const usedColors = countUsedColors(store.tagColors);
  const namedGroups = useMemo(() => {
    const colors = new Set<GroupColorId>();
    for (const c of Object.values(store.tagColors)) {
      if (c) colors.add(c);
    }
    let named = 0;
    for (const c of colors) {
      if (store.groups[c]?.title?.trim()) named += 1;
    }
    return { total: colors.size, named };
  }, [store.tagColors, store.groups]);

  const groupNamed =
    usedColors >= 2 && namedGroups.total >= 2 && namedGroups.named === namedGroups.total;
  const sentenceReady = selectedTags.some((t) => t.colorId);
  const sentenceFilled = useMemo(() => {
    return orderedUsedColorIds(store.tagColors).some((id) => {
      const s = store.sentences[id];
      return Boolean(s?.valuePhrase.trim() && s?.actionPhrase.trim());
    });
  }, [store.tagColors, store.sentences]);

  const openWishIndex = wishes.findIndex((w) => w.entryId === store.ui.openWishId);
  const openWish = openWishIndex >= 0 ? wishes[openWishIndex] : null;
  const openEpisode = store.episodes.find((e) => e.id === store.ui.openEpisodeId) ?? null;

  const fetchWishAi = useCallback(async (wishId: string, text: string) => {
    const data = await fetchPersona();
    const hit = data.wishes.find((w) => w.id === wishId || w.text === text);
    if (hit?.valueOptions?.length) return hit.valueOptions;
    return data.defaultValueOptions ?? [];
  }, []);

  const fetchEpisodeAi = useCallback(async (episode: string, emotion: string) => {
    const data = await fetchPersona();
    const hit = data.movingEpisodes?.find(
      (e) => e.episode === episode || e.emotion === emotion
    );
    if (hit?.valueOptions?.length) return hit.valueOptions;
    // 簡易: 感情キーワードでフィルタ、なければ default
    const defaults = data.defaultValueOptions ?? [];
    return defaults;
  }, []);

  const toggleTag = (tagId: string) => {
    const cur = store.ui.selectedTagIds;
    setSelectedTagIds(
      cur.includes(tagId) ? cur.filter((id) => id !== tagId) : [...cur, tagId]
    );
  };

  if (!hydrated) return <p className="seven-steps-placeholder">読み込み中…</p>;

  return (
    <div className="step02-values-lane">
      <Step02ValuesPhaseNav
        phase={store.ui.phase}
        onChange={(phase) => {
          onMessage(null);
          if (phase === 'sentence') ensureSentences();
          setPhase(phase);
        }}
        digDone={digDone}
        groupReady={groupReady}
        groupNamed={groupNamed}
        sentenceReady={sentenceReady}
        sentenceFilled={sentenceFilled}
      />

      {store.ui.phase === 'dig' ? (
        <>
          <Step02ValuesDeepDive
            wishes={wishes}
            optionsByWish={store.optionsByWish}
            episodes={store.episodes}
            onOpenWish={setOpenWishId}
            onOpenEpisode={setOpenEpisodeId}
            onAddEpisode={addEpisode}
            onRemoveEpisode={removeEpisode}
          />
          <p className="step02-section-footer">
            <span className="step02-section-footer-hint">
              願望 {wishDigDoneCount}/{wishes.length || 0} ／ 感動出来事 {episodeDone} 件完了
              {digDone ? ' — 掘り下げ完了' : '（願望すべて＋出来事1件以上）'}
            </span>
            <button
              type="button"
              className="step02-section-next-btn"
              disabled={!groupReady}
              onClick={() => {
                setPhase('group');
                setGroupSubStep('color');
              }}
            >
              まとめるへ
            </button>
          </p>
        </>
      ) : null}

      {store.ui.phase === 'group' ? (
        <>
          <div className="step02-group-subnav" role="tablist">
            <button
              type="button"
              className={`step02-group-subnav-btn${
                store.ui.groupSubStep === 'color' ? ' is-active' : ''
              }`}
              onClick={() => setGroupSubStep('color')}
            >
              ① 色分け
            </button>
            <button
              type="button"
              className={`step02-group-subnav-btn${
                store.ui.groupSubStep === 'name' ? ' is-active' : ''
              }`}
              onClick={() => setGroupSubStep('name')}
            >
              ② 命名
            </button>
          </div>
          {store.ui.groupSubStep === 'color' ? (
            <Step02InterestGroupColor
              tags={interestStyleTags}
              tagColors={store.tagColors}
              selectedTagIds={store.ui.selectedTagIds}
              activeColorId={store.ui.activeColorId}
              canUndo={store.colorHistory.length > 0}
              heading="価値観を色分けしましょう"
              emptyHint="掘り下げで価値観を選んでください。"
              onToggleTag={toggleTag}
              onSelectColor={(colorId) => {
                if (store.ui.selectedTagIds.length > 0) applyColorToSelected(colorId);
                else {
                  setActiveColorId(colorId);
                  onMessage('先に価値観ピルを選んでから色をタップしてください。');
                }
              }}
              onClearColor={() => {
                if (store.ui.selectedTagIds.length > 0) {
                  clearColorFromSelected();
                  onMessage(null);
                } else {
                  onMessage('色を外すピルを先に選んでください。');
                }
              }}
              onUndo={undoColor}
              onCommit={() => {
                commitColorGroups();
                onMessage(null);
              }}
              onAiClassifyStub={() =>
                onMessage('「Aiで分類」は後続フェーズです。手作業で色分けしてください。')
              }
            />
          ) : (
            <Step02InterestGroupName
              tags={interestStyleTags}
              groups={store.groups}
              heading="価値観をまとめてみよう"
              onChangeTitle={(id, title) => setGroupMeta(id, { title })}
              onChangeComment={(id, comment) => setGroupMeta(id, { comment })}
              onMoveTag={moveTagToColor}
              onBackToColor={() => setGroupSubStep('color')}
            />
          )}
          <p className="step02-section-footer">
            <span className="step02-section-footer-hint">
              使用色 {usedColors} ／ タイトル {namedGroups.named}/{namedGroups.total}
            </span>
            <button
              type="button"
              className="step02-section-next-btn"
              disabled={!sentenceReady}
              onClick={() => {
                ensureSentences();
                setPhase('sentence');
              }}
            >
              文にするへ
            </button>
          </p>
        </>
      ) : null}

      {store.ui.phase === 'sentence' ? (
        <Step02ValuesSentence
          tagColors={store.tagColors}
          groups={store.groups}
          sentences={store.sentences}
          onChange={(colorId, patch) => setSentence(colorId, patch)}
          onBackToGroup={() => {
            setPhase('group');
            setGroupSubStep('name');
          }}
        />
      ) : null}

      {openWish ? (
        <Step02ValuesWishModal
          wish={openWish}
          options={store.optionsByWish[openWish.entryId] ?? []}
          wishIndex={openWishIndex}
          wishTotal={wishes.length}
          onClose={() => setOpenWishId(null)}
          onSaveOptions={(opts) => setWishOptions(openWish.entryId, opts)}
          onPrev={() => {
            const prev = wishes[openWishIndex - 1];
            if (prev) setOpenWishId(prev.entryId);
          }}
          onNext={() => {
            const next = wishes[openWishIndex + 1];
            if (next) setOpenWishId(next.entryId);
          }}
          onFetchAiCandidates={() => fetchWishAi(openWish.entryId, openWish.text)}
        />
      ) : null}

      {openEpisode ? (
        <Step02ValuesEpisodeModal
          episode={openEpisode}
          onClose={() => setOpenEpisodeId(null)}
          onSave={setEpisode}
          onFetchAiCandidates={fetchEpisodeAi}
        />
      ) : null}
    </div>
  );
}
