'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AccessNotice,
  SaveStatusBadge,
  SubscribeModal,
} from '@/components/start-program/access/StartProgramAccessParts';
import type { AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import Step06FitPhase from '@/components/start-program/step06/Step06FitPhase';
import Step06PosePhase from '@/components/start-program/step06/Step06PosePhase';
import { useMandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import { useSaveStatusMock } from '@/hooks/useSaveStatusMock';
import { useStartProgramAccess } from '@/hooks/useStartProgramAccess';
import { useStartProgramAppSettings } from '@/hooks/useStartProgramAppSettings';
import { useStep03SatisfactionStore } from '@/hooks/useStep03SatisfactionStore';
import { useStep04BrakeExploreStore } from '@/hooks/useStep04BrakeExploreStore';
import { newStep05Theme, useStep05DesiredStateStore } from '@/hooks/useStep05DesiredStateStore';
import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import { stepUrl } from '@/lib/startProgram/sevenStepsConstants';
import { step04Progress } from '@/lib/startProgram/step04Constants';
import type { AiSlot } from '@/lib/startProgram/step04DeepDiveConstants';
import { generateFitAdvice } from '@/lib/startProgram/step05Ai';
import { fitInputKey, type Step05Theme } from '@/lib/startProgram/step05Constants';
import { buildStep05Context, readSelfSentences, seedItems, type SelfSentences } from '@/lib/startProgram/step05Context';
import {
  STEP06_PHASES,
  parseStep06Phase,
  step06SelfDone,
  step06WaysFilled,
  type Step06Phase,
} from '@/lib/startProgram/step06Constants';

/**
 * Step6：なし方・あり方の望む姿 → Step2 の自分らしさとの照合と修正。
 * 文面は Step5 と同じテーマに保存する。
 */
export default function Step06WorksheetPane() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPhase = searchParams.get('phase');

  const { store: step01, hydrated: step01Hydrated } = useMandalaLocalStore();
  const { store: step03, hydrated: step03Hydrated } = useStep03SatisfactionStore();
  const { activeTheme: theme4, hydrated: step04Hydrated } = useStep04BrakeExploreStore();
  const { settings, hydrated: settingsHydrated } = useStartProgramAppSettings();
  const { store, hydrated, ensureTheme, patchTheme } = useStep05DesiredStateStore();
  const [self, setSelf] = useState<SelfSentences | null>(null);
  const accessHook = useStartProgramAccess();
  const { access } = accessHook;
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  useEffect(() => {
    setSelf(readSelfSentences());
  }, []);

  const ready =
    hydrated &&
    step01Hydrated &&
    step03Hydrated &&
    step04Hydrated &&
    settingsHydrated &&
    self != null &&
    access != null;
  const readOnly = access?.status === 'expired';
  const step4Done = step04Progress(theme4, settings.step04ReasonMin).completed;
  const ctx = useMemo(
    () => (theme4 && self ? buildStep05Context(step01, step03, theme4, self) : null),
    [self, step01, step03, theme4]
  );
  const domainId = ctx?.domainId ?? null;
  const theme = domainId ? store.themes[domainId] : undefined;
  const reasons = ctx?.reasons ?? [];
  const waysFilled = step06WaysFilled(theme, reasons);
  const selfDone = step06SelfDone(theme, reasons);
  const saveStatus = useSaveStatusMock(theme);

  useEffect(() => {
    if (!ready || readOnly || !ctx || !step4Done || theme) return;
    ensureTheme(ctx.domainId, () => newStep05Theme(ctx.domainId, seedItems(ctx)));
  }, [ctx, ensureTheme, readOnly, ready, step4Done, theme]);

  const unlocked: Record<Step06Phase, boolean> = {
    pose: step4Done && theme != null,
    self: waysFilled,
  };
  const done: Record<Step06Phase, boolean> = {
    pose: waysFilled,
    self: selfDone,
  };
  const defaultPhase: Step06Phase = 'pose';
  const parsed = parseStep06Phase(rawPhase);
  const phase: Step06Phase = parsed ?? defaultPhase;

  const setPhase = useCallback(
    (next: Step06Phase) => {
      if (searchParams.get('pane') === 'worksheet' && searchParams.get('phase') === next) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('pane', 'worksheet');
      params.set('phase', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const hasTheme = theme != null;
  const phaseUnlocked = unlocked[phase];

  useEffect(() => {
    if (!ready || !hasTheme || phaseUnlocked) return;
    if (rawPhase === defaultPhase) return;
    setPhase(defaultPhase);
  }, [ready, hasTheme, phaseUnlocked, rawPhase, defaultPhase, setPhase]);

  const patch = useCallback(
    (fn: (t: Step05Theme) => Step05Theme) => {
      if (domainId) patchTheme(domainId, fn);
    },
    [domainId, patchTheme]
  );

  const inflight = useRef(false);
  const fitKey = theme ? fitInputKey(theme) : null;

  const runFit = useCallback(() => {
    if (!ctx || !theme || !fitKey || !domainId || inflight.current) return;
    const id = domainId;
    const key = fitKey;
    inflight.current = true;
    patchTheme(id, (t) => ({ ...t, ai: { ...t.ai, fit: { ...t.ai.fit, status: 'loading' } } }));
    void generateFitAdvice(ctx, theme)
      .then((data) => {
        patchTheme(id, (t) => ({
          ...t,
          ai: {
            ...t.ai,
            fit: {
              ...t.ai.fit,
              status: 'ready',
              data,
              refreshedNotice: t.ai.fit.data != null && t.ai.fit.inputKey !== key,
              inputKey: key,
            },
          },
        }));
      })
      .catch(() => {
        patchTheme(id, (t) => ({
          ...t,
          ai: { ...t.ai, fit: { ...t.ai.fit, status: 'error', inputKey: key } },
        }));
      })
      .finally(() => {
        inflight.current = false;
      });
  }, [ctx, domainId, fitKey, patchTheme, theme]);

  const needsFit = (slot: AiSlot<unknown> | undefined, key: string | null) =>
    slot != null && key != null && slot.status !== 'loading' && slot.inputKey !== key;

  useEffect(() => {
    if (!ready || readOnly || phase !== 'self' || !waysFilled) return;
    if (needsFit(theme?.ai.fit, fitKey)) runFit();
  }, [fitKey, phase, readOnly, ready, runFit, theme?.ai.fit, waysFilled]);

  const fitAi: AiControls = {
    retry: () => runFit(),
    refresh: () => runFit(),
    dismissNotice: () =>
      patch((t) => ({
        ...t,
        ai: { ...t.ai, fit: { ...t.ai.fit, refreshedNotice: false } },
      })),
  };

  if (!ready) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step06">
        <p className="seven-steps-worksheet-hint">読み込み中...</p>
      </div>
    );
  }

  if (!ctx || !step4Done) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step06">
        <section className="step04-theme-note step05-locked" role="status">
          <p>Step6 は、Step4 の「こころの深掘り」で、どれか1つの課題の気づきを保存すると始められます。</p>
          <button
            type="button"
            className="mandala-modal-btn"
            onClick={() => router.push(`${stepUrl(4, 'worksheet')}&phase=deepdive`)}
          >
            Step4 に戻る
          </button>
        </section>
      </div>
    );
  }

  const accessUi = access ? (
    <>
      <AccessNotice
        access={access}
        noticeSeen={accessHook.state?.step05NoticeSeenAt != null}
        onNoticeSeen={accessHook.markNoticeSeen}
        onSubscribe={() => setSubscribeOpen(true)}
        includeIntro={false}
      />
      {subscribeOpen ? (
        <SubscribeModal
          onClose={() => setSubscribeOpen(false)}
          onConfirm={() => {
            accessHook.subscribe();
            setSubscribeOpen(false);
          }}
        />
      ) : null}
    </>
  ) : null;

  if (!theme) {
    return (
      <div className="seven-steps-worksheet seven-steps-worksheet--step06">
        {readOnly ? accessUi : <p className="seven-steps-worksheet-hint">準備しています...</p>}
      </div>
    );
  }

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step06">
      <nav className="step02-phase-nav step04-phase-nav step05-phase-nav" aria-label="Step6のプロセス">
        <ol className="step02-phase-nav-list">
          {STEP06_PHASES.map((item) => {
            const locked = !unlocked[item.id];
            const isActive = phase === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`step02-phase-nav-btn${isActive ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
                  disabled={locked}
                  aria-current={isActive ? 'step' : undefined}
                  title={locked ? 'なし方・あり方の欄をすべて書いてください' : undefined}
                  onClick={() => setPhase(item.id)}
                >
                  {item.label}
                  {done[item.id] ? <span className="step02-phase-nav-check">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      {accessUi}

      <div className="step04-context" aria-label="取り組み中のテーマ">
        <div className="step04-context-main">
          <span className="step04-context-label">テーマ</span>
          <span className="step04-context-name">{ctx.domainLabel}</span>
          <span className="step04-context-score">満足度 {ctx.score ?? '—'} → 目標 {theme.targetScore}</span>
          <SaveStatusBadge status={saveStatus} />
        </div>
      </div>

      <fieldset className="sp-readonly-scope" disabled={readOnly} aria-label={readOnly ? '見るだけ' : undefined}>
        {phase === 'pose' ? (
          <Step06PosePhase
            ctx={ctx}
            theme={theme}
            ready={waysFilled}
            onChange={patch}
            onNext={() => setPhase('self')}
          />
        ) : null}
        {phase === 'self' && unlocked.self ? (
          <Step06FitPhase
            ctx={ctx}
            theme={theme}
            ready={selfDone}
            hasWeak={Object.values(theme.fit).includes('weak')}
            onChange={patch}
            onRate={(key, rating) => patch((t) => ({ ...t, fit: { ...t.fit, [key]: rating } }))}
            fitAi={fitAi}
          />
        ) : null}
      </fieldset>
    </div>
  );
}
