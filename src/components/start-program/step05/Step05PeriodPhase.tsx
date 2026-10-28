'use client';

import { useState } from 'react';
import type { AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import { AiSuggestions } from '@/components/start-program/step05/Step05Parts';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import type { Step05Theme } from '@/lib/startProgram/step05Constants';
import {
  HORIZONS,
  STAGES,
  STEP05_MILESTONE_MAX_CHARS,
  addDays,
  diffDays,
  formatMD,
  formatYMD,
  isDateKey,
  nextWeekStart,
  periodFromHorizon,
  periodProblem,
  stageOf,
  stageRanges,
  withDefaults,
  type StageKind,
  type Step05Marker,
  type Step05Period,
  type Step05PlanDraft,
  type Step05PlanProgress,
} from '@/lib/startProgram/step05PlanConstants';

type Step05PeriodPhaseProps = {
  theme: Step05Theme;
  progress: Step05PlanProgress;
  patchPlan: (fn: (p: Step05PlanDraft) => Step05PlanDraft) => void;
  milestonesAi: AiControls;
  onNext: () => void;
};

function ExpectedInput({
  marker,
  value,
  onChange,
}: {
  marker: Step05Marker;
  value: string;
  onChange: (v: string) => void;
}) {
  if (marker.kind === 'yesno') {
    return (
      <select value={value || 'no'} onChange={(e) => onChange(e.target.value)}>
        <option value="no">まだ</option>
        <option value="yes">できた</option>
      </select>
    );
  }
  return (
    <input
      type={marker.kind === 'words' ? 'text' : 'number'}
      min={0}
      max={marker.kind === 'scale10' ? 10 : undefined}
      value={value}
      placeholder={marker.kind === 'words' ? 'ことばで' : '—'}
      onChange={(e) => onChange(clipStep05(e.target.value, 'markerValue'))}
    />
  );
}

/** ⑧ いつまでに：開始日・達成時期（幅つき）・3段階・節目の姿 */
export default function Step05PeriodPhase({
  theme,
  progress,
  patchPlan,
  milestonesAi,
  onNext,
}: Step05PeriodPhaseProps) {
  const plan = theme.plan;
  const period = plan.period;
  const slot = theme.ai.milestones;
  const [startDraft, setStartDraft] = useState(() => nextWeekStart());
  const problem = periodProblem(period);
  const ranges = period && !problem ? stageRanges(period) : null;

  const setPeriod = (next: Step05Period) => patchPlan((p) => ({ ...p, period: next }));

  const changeStart = (start: string) => {
    if (!isDateKey(start)) return;
    if (!period) {
      setStartDraft(start);
      return;
    }
    const h = HORIZONS.find((x) => x.id === period.horizon);
    if (h) {
      setPeriod(periodFromHorizon(start, h.months, h.id));
      return;
    }
    const shift = diffDays(period.startDate, start);
    setPeriod({
      startDate: start,
      horizon: 'custom',
      targetDate: addDays(period.targetDate, shift),
      targetDateLatest: addDays(period.targetDateLatest, shift),
      expandEndDate: addDays(period.expandEndDate, shift),
    });
  };

  const patchStage = (
    kind: StageKind,
    fn: (s: Step05PlanDraft['stages'][number]) => Step05PlanDraft['stages'][number]
  ) => patchPlan((p) => ({ ...p, stages: p.stages.map((s) => (s.kind === kind ? fn(s) : s)) }));

  const applyDraft = (kind: StageKind) => {
    const d = slot.data?.milestones[kind];
    if (!d) return;
    patchStage(kind, (s) => ({
      ...s,
      milestone: clipStep05(d.text, 'milestone'),
      expected: { ...d.expected, ...Object.fromEntries(Object.entries(s.expected).filter(([, v]) => v.trim())) },
    }));
  };

  const leftMilestones = plan.stages.filter((s) => !s.milestone.trim()).length;

  return (
    <div className="step05-period">
      <h2 className="seven-steps-worksheet-heading">いつまでに、どこまで進みますか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        期間を「なじむ → 広げる → 根づかせる」の3段階に分けます。最初の4週は今の力を知る「ためし期間」です。
        最初の計画は粗くて大丈夫です。なじむ の終わりに、見直しの日を置きます。
      </p>

      <section className="step05-period-form" aria-label="期間">
        <label className="step05-period-field">
          <span>開始日</span>
          <input type="date" value={period?.startDate ?? startDraft} onChange={(e) => changeStart(e.target.value)} />
        </label>
        <div className="step05-period-field">
          <span>達成時期</span>
          <div className="step04-dd-pills">
            {HORIZONS.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`step04-dd-pill${period?.horizon === h.id ? ' is-selected' : ''}`}
                onClick={() => setPeriod(periodFromHorizon(period?.startDate ?? startDraft, h.months, h.id))}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
        {period ? (
          <>
            <label className="step05-period-field">
              <span>達成時期（日付で調整）</span>
              <input
                type="date"
                value={period.targetDate}
                onChange={(e) =>
                  isDateKey(e.target.value) &&
                  setPeriod(
                    withDefaults({ startDate: period.startDate, horizon: 'custom', targetDate: e.target.value })
                  )
                }
              />
            </label>
            <label className="step05-period-field">
              <span>幅（遅くとも）</span>
              <input
                type="date"
                value={period.targetDateLatest}
                onChange={(e) =>
                  isDateKey(e.target.value) && setPeriod({ ...period, targetDateLatest: e.target.value })
                }
              />
            </label>
            <label className="step05-period-field">
              <span>広げる の終わり</span>
              <input
                type="date"
                value={period.expandEndDate}
                onChange={(e) => isDateKey(e.target.value) && setPeriod({ ...period, expandEndDate: e.target.value })}
              />
            </label>
          </>
        ) : null}
      </section>

      {period && problem ? (
        <p className="step04-dd-notice is-error" role="alert">
          {problem}
        </p>
      ) : null}
      {period && !problem ? (
        <p className="step05-period-summary">
          {formatYMD(period.startDate)} から {formatYMD(period.targetDate)}（遅くとも{' '}
          {formatYMD(period.targetDateLatest)}）
        </p>
      ) : null}

      {ranges ? (
        <>
          <AiSuggestions
            slot={slot}
            label="節目の姿の下書き"
            onRetry={milestonesAi.retry}
            onRefresh={milestonesAi.refresh}
            onDismissNotice={milestonesAi.dismissNotice}
          >
            <p className="step05-ai-hint">各段階の「下書き」を押すと、節目の姿と、しるしの期待値が入ります。</p>
          </AiSuggestions>

          <ol className="step05-stages">
            {STAGES.map((s) => {
              const stage = stageOf(plan, s.kind);
              const range = ranges[s.kind];
              const draft = slot.status === 'loading' ? null : slot.data?.milestones[s.kind];
              return (
                <li key={s.kind} className={`step05-stage step05-stage--${s.kind}`}>
                  <p className="step05-stage-head">
                    <span className="step05-stage-name">{s.name}</span>
                    <span className="step05-stage-range">
                      {formatMD(range.start)}〜{formatMD(range.end)}（{diffDays(range.start, range.end) + 1} 日）
                    </span>
                  </p>
                  <p className="step05-stage-aim">{s.aim}</p>
                  {s.kind === 'settle' ? (
                    <p className="step05-stage-review">見直しの日：{formatMD(range.end)}（めやすと期間を見直します）</p>
                  ) : null}
                  <label className="step05-current-label">
                    <span className="step05-current-tag is-target">節目の姿</span>
                    <textarea
                      className="step04-reason-input step05-item-input"
                      rows={2}
                      value={stage.milestone}
                      maxLength={STEP05_MILESTONE_MAX_CHARS}
                      placeholder="ここまで来ていたら順調、という姿を一文で"
                      onChange={(e) =>
                        patchStage(s.kind, (x) => ({ ...x, milestone: clipStep05(e.target.value, 'milestone') }))
                      }
                    />
                  </label>
                  {draft ? (
                    <button
                      type="button"
                      className={`step04-dd-pill step05-draft${stage.milestone === draft.text ? ' is-selected' : ''}`}
                      onClick={() => applyDraft(s.kind)}
                    >
                      下書き：{draft.text}
                    </button>
                  ) : slot.status === 'loading' ? (
                    <span className="step04-dd-skeleton-pill step05-draft-skeleton" aria-hidden />
                  ) : null}
                  <div className="step05-expected">
                    <p className="step05-marker-key">しるしの期待値</p>
                    {plan.markers.map((m) => (
                      <label key={m.id} className="step05-expected-row">
                        <span className="step05-expected-label">{m.label}</span>
                        <ExpectedInput
                          marker={m}
                          value={stage.expected[m.id] ?? ''}
                          onChange={(v) =>
                            patchStage(s.kind, (x) => ({ ...x, expected: { ...x.expected, [m.id]: v } }))
                          }
                        />
                        {m.kind === 'count' ? <span className="step05-marker-unit">{m.unit || '回'}</span> : null}
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!progress.periodReady}
          onClick={onNext}
        >
          振れ幅へ
        </button>
        {!progress.periodReady ? (
          <p className="step03-phase-actions-hint">
            {!period || problem ? '期間を決めてください' : `節目の姿があと ${leftMilestones} 段階です`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
