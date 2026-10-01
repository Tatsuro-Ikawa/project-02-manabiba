'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import Step02InterestDeepDive from '@/components/start-program/step02/Step02InterestDeepDive';
import Step02InterestGroupColor from '@/components/start-program/step02/Step02InterestGroupColor';
import Step02InterestGroupName from '@/components/start-program/step02/Step02InterestGroupName';
import Step02InterestModal from '@/components/start-program/step02/Step02InterestModal';
import Step02InterestPhaseNav from '@/components/start-program/step02/Step02InterestPhaseNav';
import Step02InterestSentence from '@/components/start-program/step02/Step02InterestSentence';
import Step02LanePicker from '@/components/start-program/step02/Step02LanePicker';
import Step02StrengthLane from '@/components/start-program/step02/Step02StrengthLane';
import Step02ValuesLane from '@/components/start-program/step02/Step02ValuesLane';
import { useMandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import { useStep02InterestStore } from '@/hooks/useStep02InterestStore';
import { useStep02StrengthStore } from '@/hooks/useStep02StrengthStore';
import { useStep02ValuesStore } from '@/hooks/useStep02ValuesStore';
import {
  MANDALA_DOMAINS,
  emptyMandalaDomains,
  type MandalaDomainsState,
  type MandalaEntryLocal,
} from '@/lib/startProgram/mandalaConstants';
import {
  STEP02_DUMMY_PERSONAS,
  countUsedColors,
  createInterestOptionId,
  defaultInterestStore,
  flattenSelectedTags,
  getActiveDummyPath,
  orderedUsedColorIds,
  setActiveDummyPath,
  type DummyPersonaFile,
  type GroupColorId,
  type InterestOption,
  type MandalaWishRef,
  type Step02Lane,
} from '@/lib/startProgram/step02Constants';
import {
  createValueOptionId,
  defaultValuesStore,
  type MovingEpisode,
  type ValueOption,
} from '@/lib/startProgram/step02ValuesConstants';
import {
  createStrengthOptionId,
  defaultStrengthStore,
  type StrengthEpisode,
  type StrengthOption,
} from '@/lib/startProgram/step02StrengthConstants';

function collectInterestWishes(domains: MandalaDomainsState): MandalaWishRef[] {
  const list: MandalaWishRef[] = [];
  for (const domain of MANDALA_DOMAINS) {
    for (const entry of domains[domain.id]) {
      if (entry.text.trim() && entry.motivation === 'interest') {
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

function collectWishIdsByMotivation(
  domains: MandalaDomainsState,
  motivation: 'interest' | 'values' | 'strength'
): string[] {
  const ids: string[] = [];
  for (const domain of MANDALA_DOMAINS) {
    for (const entry of domains[domain.id]) {
      if (entry.text.trim() && entry.motivation === motivation) {
        ids.push(entry.id);
      }
    }
  }
  return ids;
}

async function fetchDummyPersona(path: string): Promise<DummyPersonaFile> {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('dummy fetch failed');
  return (await res.json()) as DummyPersonaFile;
}

/** Step2 ワークシート: 入口＋興味／価値観レーン */
export default function Step02WorksheetPane() {
  const { store: mandala, hydrated: mandalaHydrated, persist: persistMandala } =
    useMandalaLocalStore();
  const {
    store: interest,
    hydrated: interestHydrated,
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
  } = useStep02InterestStore();
  const { store: valuesStore, replaceAll: replaceValuesAll, hydrated: valuesHydrated } =
    useStep02ValuesStore();
  const {
    store: strengthStore,
    replaceAll: replaceStrengthAll,
    hydrated: strengthHydrated,
  } = useStep02StrengthStore();

  const [dummyMsg, setDummyMsg] = useState<string | null>(null);
  const [dummyLoading, setDummyLoading] = useState(false);

  const wishes = useMemo(
    () => collectInterestWishes(mandala.domains),
    [mandala.domains]
  );
  const valueWishIds = useMemo(
    () => collectWishIdsByMotivation(mandala.domains, 'values'),
    [mandala.domains]
  );
  const strengthWishIds = useMemo(
    () => collectWishIdsByMotivation(mandala.domains, 'strength'),
    [mandala.domains]
  );

  const digDoneCount = useMemo(
    () =>
      wishes.filter((w) =>
        (interest.optionsByWish[w.entryId] ?? []).some((o) => o.selected)
      ).length,
    [wishes, interest.optionsByWish]
  );
  const digDone = wishes.length > 0 && digDoneCount === wishes.length;

  const valuesDigDoneCount = useMemo(
    () =>
      valueWishIds.filter((id) =>
        (valuesStore.optionsByWish[id] ?? []).some((o) => o.selected)
      ).length,
    [valueWishIds, valuesStore.optionsByWish]
  );
  const strengthDigDoneCount = useMemo(
    () =>
      strengthWishIds.filter((id) =>
        (strengthStore.optionsByWish[id] ?? []).some((o) => o.selected)
      ).length,
    [strengthWishIds, strengthStore.optionsByWish]
  );

  const selectedTags = useMemo(
    () => flattenSelectedTags(interest.optionsByWish, interest.tagColors),
    [interest.optionsByWish, interest.tagColors]
  );
  const groupReady = selectedTags.length > 0;

  const usedColors = countUsedColors(interest.tagColors);
  const namedGroups = useMemo(() => {
    const colors = new Set<GroupColorId>();
    for (const c of Object.values(interest.tagColors)) {
      if (c) colors.add(c);
    }
    let named = 0;
    for (const c of colors) {
      const title = interest.groups[c]?.title?.trim();
      if (title) named += 1;
    }
    return { total: colors.size, named };
  }, [interest.tagColors, interest.groups]);

  const groupNamed =
    usedColors >= 2 &&
    namedGroups.total >= 2 &&
    namedGroups.named === namedGroups.total;

  const sentenceReady = selectedTags.some((t) => t.colorId);

  const sentenceFilled = useMemo(() => {
    const ids = orderedUsedColorIds(interest.tagColors);
    return ids.some((id) => {
      const s = interest.sentences[id];
      return Boolean(s?.interestPhrase.trim() && s?.actionPhrase.trim());
    });
  }, [interest.tagColors, interest.sentences]);

  const goToSentence = () => {
    ensureSentences();
    setPhase('sentence');
  };

  const openWishIndex = wishes.findIndex((w) => w.entryId === interest.ui.openWishId);
  const openWish = openWishIndex >= 0 ? wishes[openWishIndex] : null;

  const handleSelectLane = (lane: Step02Lane) => {
    setDummyMsg(null);
    setLane(lane);
  };

  const loadDummy = useCallback(async (path: string, personaLabel: string) => {
    if (
      !window.confirm(
        `${personaLabel}想定のダミーデータで Step1／Step2 を上書きします。よろしいですか？`
      )
    ) {
      return;
    }
    setDummyLoading(true);
    setDummyMsg(null);
    try {
      const data = await fetchDummyPersona(path);
      const domains = emptyMandalaDomains();
      const now = Date.now();
      const optionsByWish: Record<string, InterestOption[]> = {};
      const valueOptionsByWish: Record<string, ValueOption[]> = {};
      const strengthOptionsByWish: Record<string, StrengthOption[]> = {};

      data.wishes.forEach((w, sortOrder) => {
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

        if (w.motivation === 'interest' && w.interestOptions?.length) {
          optionsByWish[w.id] = w.interestOptions.map((label) => ({
            id: createInterestOptionId(),
            wishEntryId: w.id,
            label,
            source: 'dummy' as const,
            selected: false,
          }));
        }
        if (w.motivation === 'values' && w.valueOptions?.length) {
          valueOptionsByWish[w.id] = w.valueOptions.map((label) => ({
            id: createValueOptionId(),
            sourceId: w.id,
            sourceType: 'wish' as const,
            label,
            source: 'dummy' as const,
            selected: false,
          }));
        }
        if (w.motivation === 'strength' && w.strengthOptions?.length) {
          strengthOptionsByWish[w.id] = w.strengthOptions.map((label) => ({
            id: createStrengthOptionId(),
            sourceId: w.id,
            sourceType: 'wish' as const,
            label,
            source: 'dummy' as const,
            selected: false,
          }));
        }
      });

      const episodes: MovingEpisode[] = (data.movingEpisodes ?? []).map((ep) => ({
        id: ep.id,
        episode: ep.episode,
        emotion: ep.emotion,
        options: (ep.valueOptions ?? []).map((label) => ({
          id: createValueOptionId(),
          sourceId: ep.id,
          sourceType: 'episode' as const,
          label,
          source: 'dummy' as const,
          selected: false,
        })),
      }));

      const strengthEpisodes: StrengthEpisode[] = [
        ...(data.praiseEpisodes ?? []).map((ep) => ({
          id: ep.id,
          kind: 'praise' as const,
          episode: ep.episode,
          emotion: ep.emotion,
          options: (ep.strengthOptions ?? []).map((label) => ({
            id: createStrengthOptionId(),
            sourceId: ep.id,
            sourceType: 'episode' as const,
            label,
            source: 'dummy' as const,
            selected: false,
          })),
        })),
        ...(data.naturalEpisodes ?? []).map((ep) => ({
          id: ep.id,
          kind: 'natural' as const,
          episode: ep.episode,
          emotion: ep.emotion,
          options: (ep.strengthOptions ?? []).map((label) => ({
            id: createStrengthOptionId(),
            sourceId: ep.id,
            sourceType: 'episode' as const,
            label,
            source: 'dummy' as const,
            selected: false,
          })),
        })),
      ];

      persistMandala({ domains, centerGoal: data.centerGoal });
      replaceAll({
        ...defaultInterestStore(),
        optionsByWish,
        ui: {
          ...defaultInterestStore().ui,
          lane: 'interest',
          phase: 'dig',
        },
      });
      replaceValuesAll({
        ...defaultValuesStore(),
        optionsByWish: valueOptionsByWish,
        episodes: episodes.length > 0 ? episodes : defaultValuesStore().episodes,
        ui: {
          ...defaultValuesStore().ui,
          phase: 'dig',
        },
      });
      replaceStrengthAll({
        ...defaultStrengthStore(),
        optionsByWish: strengthOptionsByWish,
        episodes:
          strengthEpisodes.length > 0
            ? strengthEpisodes
            : defaultStrengthStore().episodes,
        ui: {
          ...defaultStrengthStore().ui,
          phase: 'dig',
        },
      });
      setActiveDummyPath(path);
      setDummyMsg(`ダミー「${data.persona.name}」を読み込みました（localStorage に保存）。`);
    } catch {
      setDummyMsg('ダミーデータの読み込みに失敗しました。');
    } finally {
      setDummyLoading(false);
    }
  }, [persistMandala, replaceAll, replaceValuesAll, replaceStrengthAll]);

  const fetchAiForWish = useCallback(
    async (wishEntryId: string, wishText: string): Promise<string[]> => {
      const data = await fetchDummyPersona(getActiveDummyPath());
      const hit = data.wishes.find((w) => w.id === wishEntryId || w.text === wishText);
      if (hit?.interestOptions?.length) return hit.interestOptions;
      return [];
    },
    []
  );

  const toggleTag = (tagId: string) => {
    const cur = interest.ui.selectedTagIds;
    if (cur.includes(tagId)) {
      setSelectedTagIds(cur.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...cur, tagId]);
    }
  };

  const onSelectColor = (colorId: Exclude<GroupColorId, 'other'>) => {
    if (interest.ui.selectedTagIds.length > 0) {
      applyColorToSelected(colorId);
    } else {
      setActiveColorId(colorId);
      setDummyMsg('先に興味ピルを選んでから色をタップしてください。');
    }
  };

  const onClearColor = () => {
    if (interest.ui.selectedTagIds.length > 0) {
      clearColorFromSelected();
      setDummyMsg(null);
    } else {
      setDummyMsg('色を外すピルを先に選んでください。');
    }
  };

  if (!mandalaHydrated || !interestHydrated || !valuesHydrated || !strengthHydrated) {
    return <p className="seven-steps-placeholder">読み込み中…</p>;
  }

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step02">
      <h2 className="seven-steps-worksheet-heading">
        ポジティブな“自分らしさ”。「こころのアクセル」を見つけよう！
      </h2>

      <p className="step02-dummy-toolbar">
        {STEP02_DUMMY_PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            className="step02-auto-draft-btn"
            disabled={dummyLoading}
            onClick={() => loadDummy(persona.path, persona.label)}
          >
            {dummyLoading ? '読込中…' : `${persona.label}を読み込む`}
          </button>
        ))}
        <span className="step02-dummy-toolbar-hint">
          編集可: <code>public/.../step02/dummy/*.json</code>
        </span>
      </p>
      {dummyMsg ? (
        <p className="step02-guard-hint" role="status">
          {dummyMsg}
        </p>
      ) : null}

      {mandala.centerGoal ? (
        <aside className="step02-center-context" aria-label="人生の中心目標">
          <p className="step02-center-context-label">人生の中心目標</p>
          <p className="step02-center-context-text">{mandala.centerGoal}</p>
        </aside>
      ) : null}

      <Step02LanePicker
        activeLane={interest.ui.lane}
        onSelect={handleSelectLane}
        interest={{ done: digDoneCount, total: wishes.length }}
        values={{ done: valuesDigDoneCount, total: valueWishIds.length }}
        strength={{ done: strengthDigDoneCount, total: strengthWishIds.length }}
      />

      {interest.ui.lane === 'interest' ? (
        <>
          <Step02InterestPhaseNav
            phase={interest.ui.phase}
            onChange={(phase) => {
              setDummyMsg(null);
              if (phase === 'group') setGroupSubStep(interest.ui.groupSubStep || 'color');
              if (phase === 'sentence') ensureSentences();
              setPhase(phase);
            }}
            digDone={digDone}
            groupReady={groupReady}
            groupNamed={groupNamed}
            sentenceReady={sentenceReady}
            sentenceFilled={sentenceFilled}
          />

          {interest.ui.phase === 'dig' ? (
            <>
              {wishes.length === 0 ? (
                <p className="step02-empty-hint">
                  興味分類の願望がありません。
                  <Link
                    href="/start-program/seven-steps/step/1?pane=worksheet"
                    className="step02-link-step01"
                  >
                    Step1 へ
                  </Link>
                  ／または「ダミーを読み込む」で確認できます。
                </p>
              ) : (
                <Step02InterestDeepDive
                  wishes={wishes}
                  optionsByWish={interest.optionsByWish}
                  onOpenWish={setOpenWishId}
                />
              )}
              <p className="step02-section-footer">
                <span className="step02-section-footer-hint">
                  掘り下げ: {digDoneCount}/{wishes.length}
                  {digDone ? ' — 完了' : '（各願望で1つ以上選択）'}
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

          {interest.ui.phase === 'group' ? (
            <>
              <div className="step02-group-subnav" role="tablist" aria-label="まとめる手順">
                <button
                  type="button"
                  role="tab"
                  aria-selected={interest.ui.groupSubStep === 'color'}
                  className={`step02-group-subnav-btn${
                    interest.ui.groupSubStep === 'color' ? ' is-active' : ''
                  }`}
                  onClick={() => setGroupSubStep('color')}
                >
                  ① 色分け
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={interest.ui.groupSubStep === 'name'}
                  className={`step02-group-subnav-btn${
                    interest.ui.groupSubStep === 'name' ? ' is-active' : ''
                  }`}
                  onClick={() => setGroupSubStep('name')}
                >
                  ② 命名
                </button>
              </div>

              {interest.ui.groupSubStep === 'color' ? (
                <Step02InterestGroupColor
                  tags={selectedTags}
                  tagColors={interest.tagColors}
                  selectedTagIds={interest.ui.selectedTagIds}
                  activeColorId={interest.ui.activeColorId}
                  canUndo={interest.colorHistory.length > 0}
                  onToggleTag={toggleTag}
                  onSelectColor={onSelectColor}
                  onClearColor={onClearColor}
                  onUndo={undoColor}
                  onCommit={() => {
                    if (usedColors < 1 && selectedTags.every((t) => !t.colorId)) {
                      setDummyMsg(
                        '少なくとも1色で色分けしてから「まとめる」を押してください。'
                      );
                      return;
                    }
                    setDummyMsg(null);
                    commitColorGroups();
                  }}
                  onAiClassifyStub={() =>
                    setDummyMsg(
                      '「Aiで分類」は P2 で実装予定です。いまは手作業で色分けしてください。'
                    )
                  }
                />
              ) : (
                <Step02InterestGroupName
                  tags={selectedTags}
                  groups={interest.groups}
                  onChangeTitle={(colorId, title) => setGroupMeta(colorId, { title })}
                  onChangeComment={(colorId, comment) =>
                    setGroupMeta(colorId, { comment })
                  }
                  onMoveTag={moveTagToColor}
                  onBackToColor={() => setGroupSubStep('color')}
                />
              )}

              <p className="step02-section-footer">
                <span className="step02-section-footer-hint">
                  使用色 {usedColors} ／ タイトル入力 {namedGroups.named}/{namedGroups.total}
                  {groupNamed ? ' — まとめる完了' : '（完了目安: 2色以上＋各タイトル）'}
                </span>
                <button
                  type="button"
                  className="step02-section-next-btn"
                  disabled={!sentenceReady}
                  onClick={goToSentence}
                >
                  文にするへ
                </button>
              </p>
            </>
          ) : null}

          {interest.ui.phase === 'sentence' ? (
            <Step02InterestSentence
              tagColors={interest.tagColors}
              groups={interest.groups}
              sentences={interest.sentences}
              onChange={(colorId, patch) => setSentence(colorId, patch)}
              onBackToGroup={() => {
                setPhase('group');
                setGroupSubStep('name');
              }}
            />
          ) : null}
        </>
      ) : null}

      {interest.ui.lane === 'values' ? (
        <Step02ValuesLane domains={mandala.domains} onMessage={setDummyMsg} />
      ) : null}

      {interest.ui.lane === 'strength' ? (
        <Step02StrengthLane domains={mandala.domains} onMessage={setDummyMsg} />
      ) : null}

      {openWish ? (
        <Step02InterestModal
          wish={openWish}
          options={interest.optionsByWish[openWish.entryId] ?? []}
          wishIndex={openWishIndex}
          wishTotal={wishes.length}
          onClose={() => setOpenWishId(null)}
          onSaveOptions={(options) => setWishOptions(openWish.entryId, options)}
          onPrev={() => {
            const prev = wishes[openWishIndex - 1];
            if (prev) setOpenWishId(prev.entryId);
          }}
          onNext={() => {
            const next = wishes[openWishIndex + 1];
            if (next) setOpenWishId(next.entryId);
          }}
          onFetchAiCandidates={() => fetchAiForWish(openWish.entryId, openWish.text)}
        />
      ) : null}

      <p className="seven-steps-worksheet-footer step02-mock-badge" role="note">
        Step2: 興味・価値観・得意・強みレーン実装済。本番 AI は後続。
      </p>
    </div>
  );
}
