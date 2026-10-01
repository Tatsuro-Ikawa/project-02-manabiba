'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Step04ChangeabilityPhase from '@/components/start-program/step04/Step04ChangeabilityPhase';
import Step04LayersPhase from '@/components/start-program/step04/Step04LayersPhase';
import Step04PhaseNav from '@/components/start-program/step04/Step04PhaseNav';
import Step04ReasonsPhase from '@/components/start-program/step04/Step04ReasonsPhase';
import Step04SummaryPhase from '@/components/start-program/step04/Step04SummaryPhase';
import Step04ThemeModal from '@/components/start-program/step04/Step04ThemeModal';
import { useMandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import { useStartProgramAppSettings } from '@/hooks/useStartProgramAppSettings';
import { useStep03SatisfactionStore } from '@/hooks/useStep03SatisfactionStore';
import { useStep04BrakeExploreStore } from '@/hooks/useStep04BrakeExploreStore';
import { getMandalaDomain, type MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import { isValidSatisfactionScore } from '@/lib/startProgram/step03Constants';
import { isStep04Phase, step04Progress, type Step04Phase } from '@/lib/startProgram/step04Constants';

/** Step4：課題の明確化（領域選択＋理由） → 変えられるか → Have/Do/Be → まとめ（Ai 質問の手前まで） */
export default function Step04WorksheetPane() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPhase = searchParams.get('phase');

  const { store: step01 } = useMandalaLocalStore();
  const { store: step03, hydrated: step03Hydrated } = useStep03SatisfactionStore();
  const { settings, hydrated: settingsHydrated } = useStartProgramAppSettings();
  const {
    store,
    hydrated,
    activeTheme,
    startTheme,
    addReason,
    updateReasonText,
    removeReason,
    setChangeability,
    toggleLayerTag,
    setLayerOtherText,
    setCompleted,
  } = useStep04BrakeExploreStore();
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const reasonMin = settings.step04ReasonMin;
  const reasonMax = settings.step04ReasonMax;
  const progress = step04Progress(activeTheme, reasonMin);

  const unlocked: Record<Step04Phase, boolean> = {
    reasons: true,
    changeability: progress.reasonsReady,
    layers: progress.changeabilityReady,
    summary: progress.layersReady,
  };
  const done: Record<Step04Phase, boolean> = {
    reasons: progress.reasonsReady,
    changeability: progress.changeabilityReady,
    layers: progress.layersReady,
    summary: progress.completed,
  };

  const defaultPhase: Step04Phase = progress.completed ? 'summary' : 'reasons';
  const phase: Step04Phase = isStep04Phase(rawPhase) ? rawPhase : defaultPhase;

  const setPhase = useCallback(
    (next: Step04Phase) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('pane', 'worksheet');
      params.set('phase', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const ready = hydrated && settingsHydrated && step03Hydrated;

  // 初回は Step3 の取組領域をテーマとして選択済みにする
  useEffect(() => {
    if (!ready || store.activeDomainId || !step03.focusDomainId) return;
    startTheme(step03.focusDomainId);
  }, [ready, startTheme, step03.focusDomainId, store.activeDomainId]);

  // 復元前は全フェーズがロック扱いになるため、復元完了まで強制移動しない
  useEffect(() => {
    if (!ready || unlocked[phase]) return;
    const fallback = (['summary', 'layers', 'changeability'] as Step04Phase[]).find((p) => unlocked[p]);
    setPhase(fallback ?? 'reasons');
  });

  if (!ready) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step04">
        <p className="seven-steps-worksheet-hint">読み込み中...</p>
      </div>
    );
  }

  const domainLabel = activeTheme ? getMandalaDomain(activeTheme.domainId)?.label ?? '' : '';
  const rawScore = activeTheme ? step03.domains[activeTheme.domainId]?.score : undefined;
  const score = isValidSatisfactionScore(rawScore) ? rawScore : null;
  const wishes = activeTheme
    ? (step01.domains[activeTheme.domainId] ?? []).map((e) => e.text.trim()).filter(Boolean)
    : [];

  const handleSelectTheme = (id: MandalaDomainId) => {
    setThemeModalOpen(false);
    if (id === store.activeDomainId) return;
    const existing = store.themes[id];
    startTheme(id);
    setPhase(existing?.completedAt != null ? 'summary' : 'reasons');
  };

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step04">
      <Step04PhaseNav phase={phase} onChange={setPhase} unlocked={unlocked} done={done} />

      {activeTheme && phase !== 'reasons' ? (
        <div className="step04-context" aria-label="取り組み中のテーマ">
          <div className="step04-context-main">
            <span className="step04-context-label">テーマ</span>
            <span className="step04-context-name">{domainLabel}</span>
            <span className="step04-context-score">満足度 {score != null ? `${score}/10` : '—'}</span>
          </div>
          {wishes.length > 0 ? (
            <details className="step04-context-wishes">
              <summary>Step1 で書いた「こうなりたい」を見る</summary>
              <ul>
                {wishes.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <button type="button" className="mandala-modal-btn" onClick={() => setThemeModalOpen(true)}>
            テーマを切り替える
          </button>
        </div>
      ) : null}

      {phase === 'reasons' ? (
        <Step04ReasonsPhase
          theme={activeTheme}
          domainLabel={domainLabel}
          isStep3Focus={activeTheme != null && activeTheme.domainId === step03.focusDomainId}
          score={score}
          wishes={wishes}
          reasonMin={reasonMin}
          reasonMax={reasonMax}
          onOpenThemeModal={() => setThemeModalOpen(true)}
          onAdd={(text) => addReason(text)}
          onUpdate={updateReasonText}
          onRemove={removeReason}
          onNext={() => setPhase('changeability')}
        />
      ) : null}

      {phase === 'changeability' && activeTheme && unlocked.changeability ? (
        <Step04ChangeabilityPhase
          theme={activeTheme}
          progress={progress}
          onSelect={setChangeability}
          onAddRescue={(text, c) => addReason(text, 'rescue', c)}
          onRemove={removeReason}
          onNext={() => setPhase('layers')}
        />
      ) : null}

      {phase === 'layers' && activeTheme && unlocked.layers ? (
        <Step04LayersPhase
          theme={activeTheme}
          progress={progress}
          onToggle={toggleLayerTag}
          onOtherText={setLayerOtherText}
          onNext={() => setPhase('summary')}
        />
      ) : null}

      {phase === 'summary' && activeTheme && unlocked.summary ? (
        <Step04SummaryPhase
          theme={activeTheme}
          domainLabel={domainLabel}
          onComplete={setCompleted}
          onChooseNextTheme={() => setThemeModalOpen(true)}
        />
      ) : null}

      {themeModalOpen ? (
        <Step04ThemeModal
          step03={step03}
          store={store}
          reasonMin={reasonMin}
          onSelect={handleSelectTheme}
          onClose={() => setThemeModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
