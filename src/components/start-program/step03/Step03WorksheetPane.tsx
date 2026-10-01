'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Step03FocusPhase from '@/components/start-program/step03/Step03FocusPhase';
import Step03PhaseNav from '@/components/start-program/step03/Step03PhaseNav';
import Step03RadarPhase from '@/components/start-program/step03/Step03RadarPhase';
import Step03SatisfactionCard from '@/components/start-program/step03/Step03SatisfactionCard';
import Step03SatisfactionModal from '@/components/start-program/step03/Step03SatisfactionModal';
import { useMandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import { useStep03SatisfactionStore } from '@/hooks/useStep03SatisfactionStore';
import {
  type MandalaDomainId,
  getMandalaDomain,
  mandalaDomainsByGridOrder,
} from '@/lib/startProgram/mandalaConstants';
import {
  allDomainsScored,
  countScoredDomains,
  emptyDomainSatisfaction,
  parseStep03Phase,
  type Step03Phase,
} from '@/lib/startProgram/step03Constants';
import {
  STEP03_DUMMY_PERSONAS,
  loadStep03DummyBundle,
  writeStep04DummyStore,
} from '@/lib/startProgram/step03Dummy';

/** Step3：採点 → レーダー → 取組領域 */
export default function Step03WorksheetPane() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const phase = parseStep03Phase(searchParams.get('phase'));

  const { store: step01, persist: persistStep01 } = useMandalaLocalStore();
  const {
    store,
    hydrated,
    persist: persistStep03,
    setScore,
    setRadarNotes,
    setCandidateDomainIds,
    setCriteria,
    setFocusDomainId,
  } = useStep03SatisfactionStore();
  const [openDomainId, setOpenDomainId] = useState<MandalaDomainId | null>(null);
  const [dummyMsg, setDummyMsg] = useState<string | null>(null);
  const [dummyLoading, setDummyLoading] = useState(false);

  const loadDummy = useCallback(
    async (path: string, personaLabel: string) => {
      if (
        !window.confirm(
          `${personaLabel}想定のダミーデータで Step1（願望）／Step3／Step4 を上書きします。よろしいですか？`
        )
      ) {
        return;
      }
      setDummyLoading(true);
      setDummyMsg(null);
      try {
        const bundle = await loadStep03DummyBundle(path);
        persistStep01(bundle.step01);
        persistStep03(bundle.step03);
        writeStep04DummyStore(bundle.step04);
        setDummyMsg(
          `ダミー「${bundle.personaName}」を読み込みました。Step3 の各フェーズと Step4（理由・変えられるか・何が変わればよい？）に入力済みです。`
        );
      } catch {
        setDummyMsg('ダミーデータの読み込みに失敗しました。');
      } finally {
        setDummyLoading(false);
      }
    },
    [persistStep01, persistStep03]
  );

  const setPhase = useCallback(
    (next: Step03Phase) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('pane', 'worksheet');
      params.set('phase', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const scoreReady = allDomainsScored(store.domains);
  const radarReady = scoreReady;
  const focusDone = store.focusDomainId != null;

  // localStorage 復元前は scoreReady=false なので、復元完了まで phase 強制しない（ちらつき防止）
  useEffect(() => {
    if (!hydrated) return;
    if ((phase === 'radar' || phase === 'focus') && !scoreReady) {
      setPhase('score');
    }
  }, [hydrated, phase, scoreReady, setPhase]);

  if (!hydrated) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step03">
        <p className="seven-steps-worksheet-hint">読み込み中...</p>
      </div>
    );
  }

  const openDomain = openDomainId ? getMandalaDomain(openDomainId) : undefined;
  const cells = mandalaDomainsByGridOrder();
  const scoredCount = countScoredDomains(store.domains);

  const centerBlock = (
    <div className="mandala-center step03-sat-center" aria-label="人生の中心目標と評価進捗">
      <p className="mandala-center-label">人生の中心目標（参照）</p>
      <p className="step03-sat-center-goal">
        {step01.centerGoal.trim() || '（Step1 未記入）'}
      </p>
      <p className="step03-sat-progress" aria-live="polite">
        評価済み {scoredCount}/8
      </p>
    </div>
  );

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step03">
      <Step03PhaseNav
        phase={phase}
        onChange={setPhase}
        scoreReady={scoreReady}
        radarReady={radarReady}
        focusDone={focusDone}
      />

      <p className="step02-dummy-toolbar">
        {STEP03_DUMMY_PERSONAS.map((persona) => (
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
          Step3・Step4 用。編集可: <code>public/.../step03/dummy/*.json</code>
        </span>
      </p>
      {dummyMsg ? (
        <p className="step02-guard-hint" role="status">
          {dummyMsg}
        </p>
      ) : null}

      {phase === 'score' ? (
        <>
          <h2 className="seven-steps-worksheet-heading">
            いまの自分に、どのくらい満足できていますか
          </h2>
          <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
            各カードで満足度（0〜10）をつけてください。8領域すべてにつけると、次の「レーダーチャート」に進めます。
          </p>

          <div className="mandala-grid" role="list" aria-label="8つの領域の満足度チャート">
            {cells.map((cell) => {
              if (cell === 'center') {
                return (
                  <div
                    key="center"
                    className="mandala-grid-cell mandala-grid-cell--center"
                    data-pos="4"
                    role="listitem"
                  >
                    {centerBlock}
                  </div>
                );
              }
              const sat = store.domains[cell.id] ?? emptyDomainSatisfaction();
              return (
                <div
                  key={cell.id}
                  className="mandala-grid-cell"
                  data-pos={String(cell.gridIndex)}
                  role="listitem"
                >
                  <Step03SatisfactionCard
                    domain={cell}
                    step01Entries={step01.domains[cell.id] ?? []}
                    satisfaction={sat}
                    onOpen={() => setOpenDomainId(cell.id)}
                  />
                </div>
              );
            })}
          </div>

          <div className="step03-phase-actions">
            <button
              type="button"
              className="mandala-modal-btn mandala-modal-btn--primary"
              disabled={!scoreReady}
              title={!scoreReady ? '8領域すべてに点数をつけてください' : undefined}
              onClick={() => setPhase('radar')}
            >
              レーダーチャートへ
            </button>
            {!scoreReady ? (
              <p className="step03-phase-actions-hint">あと {8 - scoredCount} 領域です</p>
            ) : null}
          </div>

          {openDomain ? (
            <Step03SatisfactionModal
              domain={openDomain}
              step01Entries={step01.domains[openDomain.id] ?? []}
              satisfaction={store.domains[openDomain.id] ?? emptyDomainSatisfaction()}
              onScoreChange={(score) => setScore(openDomain.id, score)}
              onClose={() => setOpenDomainId(null)}
            />
          ) : null}
        </>
      ) : null}

      {phase === 'radar' && scoreReady ? (
        <Step03RadarPhase
          store={store}
          onNotesChange={setRadarNotes}
          onGoFocus={() => setPhase('focus')}
        />
      ) : null}

      {phase === 'focus' && scoreReady ? (
        <Step03FocusPhase
          store={store}
          onCandidatesChange={setCandidateDomainIds}
          onCriteriaChange={setCriteria}
          onFocusChange={setFocusDomainId}
        />
      ) : null}
    </div>
  );
}
