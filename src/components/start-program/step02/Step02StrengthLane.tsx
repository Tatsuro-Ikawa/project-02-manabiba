'use client';

import { useCallback, useMemo } from 'react';
import Step02InterestGroupColor from '@/components/start-program/step02/Step02InterestGroupColor';
import Step02InterestGroupName from '@/components/start-program/step02/Step02InterestGroupName';
import Step02StrengthDeepDive from '@/components/start-program/step02/Step02StrengthDeepDive';
import Step02StrengthEpisodeModal from '@/components/start-program/step02/Step02StrengthEpisodeModal';
import Step02StrengthPhaseNav from '@/components/start-program/step02/Step02StrengthPhaseNav';
import Step02StrengthSentence from '@/components/start-program/step02/Step02StrengthSentence';
import Step02StrengthWishModal from '@/components/start-program/step02/Step02StrengthWishModal';
import { useStep02StrengthStore } from '@/hooks/useStep02StrengthStore';
import {
  MANDALA_DOMAINS,
  type MandalaDomainsState,
} from '@/lib/startProgram/mandalaConstants';
import {
  getActiveDummyPath,
  countUsedColors,
  orderedUsedColorIds,
  type GroupColorId,
  type InterestTag,
  type MandalaWishRef,
} from '@/lib/startProgram/step02Constants';
import {
  STRENGTH_ADDITIVE_MIN_REQUIRED,
  countCompleteStrengthEpisodes,
  flattenSelectedStrengthTags,
} from '@/lib/startProgram/step02StrengthConstants';

type PersonaFile = {
  wishes: {
    id: string;
    text: string;
    motivation: string;
    strengthOptions?: string[];
  }[];
  praiseEpisodes?: {
    id: string;
    episode: string;
    emotion: string;
    strengthOptions?: string[];
  }[];
  naturalEpisodes?: {
    id: string;
    episode: string;
    emotion: string;
    strengthOptions?: string[];
  }[];
  defaultStrengthOptions?: string[];
};

function collectStrengthWishes(domains: MandalaDomainsState): MandalaWishRef[] {
  const list: MandalaWishRef[] = [];
  for (const domain of MANDALA_DOMAINS) {
    for (const entry of domains[domain.id]) {
      if (entry.text.trim() && entry.motivation === 'strength') {
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
  tags: ReturnType<typeof flattenSelectedStrengthTags>
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

/** 得意・強みレーン（掘り下げ→まとめる→文にする） */
export default function Step02StrengthLane({ domains, onMessage }: Props) {
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
  } = useStep02StrengthStore();

  const wishes = useMemo(() => collectStrengthWishes(domains), [domains]);
  const selectedTags = useMemo(
    () =>
      flattenSelectedStrengthTags(store.optionsByWish, store.episodes, store.tagColors),
    [store.optionsByWish, store.episodes, store.tagColors]
  );
  const interestStyleTags = useMemo(() => toInterestTags(selectedTags), [selectedTags]);

  const wishDigDoneCount = wishes.filter((w) =>
    (store.optionsByWish[w.entryId] ?? []).some((o) => o.selected)
  ).length;
  const wishDigDone = wishes.length === 0 || wishDigDoneCount === wishes.length;
  const additiveDone = countCompleteStrengthEpisodes(store.episodes);
  const digDone = wishDigDone && additiveDone >= STRENGTH_ADDITIVE_MIN_REQUIRED;

  const groupReady =
    selectedTags.length > 0 && additiveDone >= STRENGTH_ADDITIVE_MIN_REQUIRED;
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
      return Boolean(s?.strengthPhrase.trim() && s?.actionPhrase.trim());
    });
  }, [store.tagColors, store.sentences]);

  const openWishIndex = wishes.findIndex((w) => w.entryId === store.ui.openWishId);
  const openWish = openWishIndex >= 0 ? wishes[openWishIndex] : null;
  const openEpisode = store.episodes.find((e) => e.id === store.ui.openEpisodeId) ?? null;

  const fetchWishAi = useCallback(async (wishId: string, text: string) => {
    const data = await fetchPersona();
    const hit = data.wishes.find((w) => w.id === wishId || w.text === text);
    if (hit?.strengthOptions?.length) return hit.strengthOptions;
    return data.defaultStrengthOptions ?? [];
  }, []);

  const fetchEpisodeAi = useCallback(
    async (kind: 'praise' | 'natural', episode: string, emotion: string) => {
      const data = await fetchPersona();
      const list = kind === 'praise' ? data.praiseEpisodes : data.naturalEpisodes;
      const hit = list?.find((e) => e.episode === episode || e.emotion === emotion);
      if (hit?.strengthOptions?.length) return hit.strengthOptions;
      return data.defaultStrengthOptions ?? [];
    },
    []
  );

  const toggleTag = (tagId: string) => {
    const cur = store.ui.selectedTagIds;
    setSelectedTagIds(
      cur.includes(tagId) ? cur.filter((id) => id !== tagId) : [...cur, tagId]
    );
  };

  if (!hydrated) return <p className="seven-steps-placeholder">読み込み中…</p>;

  return (
    <div className="step02-strength-lane">
      <Step02StrengthPhaseNav
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
          <Step02StrengthDeepDive
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
              願望 {wishDigDoneCount}/{wishes.length || 0} ／ 付加ソース {additiveDone}{' '}
              件完了
              {digDone
                ? ' — 掘り下げ完了'
                : '（願望すべて＋他者の言葉／自然体験のどちらか1件以上）'}
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
              heading="得意・強みを色分けしましょう"
              emptyHint="掘り下げで得意・強みを選んでください。"
              onToggleTag={toggleTag}
              onSelectColor={(colorId) => {
                if (store.ui.selectedTagIds.length > 0) applyColorToSelected(colorId);
                else {
                  setActiveColorId(colorId);
                  onMessage('先に得意・強みピルを選んでから色をタップしてください。');
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
              heading="得意・強みをまとめてみよう"
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
        <Step02StrengthSentence
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
        <Step02StrengthWishModal
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
        <Step02StrengthEpisodeModal
          episode={openEpisode}
          onClose={() => setOpenEpisodeId(null)}
          onSave={setEpisode}
          onFetchAiCandidates={fetchEpisodeAi}
        />
      ) : null}
    </div>
  );
}
