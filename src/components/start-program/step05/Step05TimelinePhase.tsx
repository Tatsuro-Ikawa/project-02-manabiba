'use client';

import type { CSSProperties } from 'react';
import { ScoreScale } from '@/components/start-program/step05/Step05Parts';
import { filledItems, getStep05Layer, type Step05Theme } from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';
import {
  STAGES,
  addDays,
  diffDays,
  focusItemIds,
  formatMD,
  formatYMD,
  markerValueLabel,
  stageOf,
  stageRanges,
  type DateKey,
  type Step05Period,
} from '@/lib/startProgram/step05PlanConstants';

type Step05TimelinePhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  onConfirm: () => void;
};

function monthTicks(p: Step05Period): DateKey[] {
  const out: DateKey[] = [];
  const [y, m] = p.startDate.split('-').map(Number);
  for (let i = 1; i < 30; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 10);
    if (diffDays(d, p.targetDateLatest) < 0) break;
    out.push(d);
  }
  return out;
}

/** ⑩ 道のり：段階・節目・しるしの予定・振れ幅をタイムラインで見える化 */
export default function Step05TimelinePhase({ ctx, theme, onConfirm }: Step05TimelinePhaseProps) {
  const plan = theme.plan;
  const period = plan.period;
  if (!period) return null;

  const ranges = stageRanges(period);
  const total = Math.max(1, diffDays(period.startDate, period.targetDateLatest) + 1);
  const pos = (d: DateKey) => Math.min(100, Math.max(0, (diffDays(period.startDate, d) / total) * 100));
  const span = (from: DateKey, to: DateKey): CSSProperties => ({
    left: `${pos(from)}%`,
    width: `${Math.max(0.6, pos(addDays(to, 1)) - pos(from))}%`,
  });

  const focusIds = focusItemIds(theme);
  const others = filledItems(theme).filter((i) => !focusIds.includes(i.id));
  const situations = plan.situationMarks
    .map((s) => ({ ...s, reason: ctx.deferred.find((r) => r.id === s.reasonId) }))
    .filter((s) => s.reason);

  return (
    <div className="step05-timeline-phase">
      <h2 className="seven-steps-worksheet-heading">あなたの道のり</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        ここまで決めたことを、ひとつの道のりにまとめました。計画は途中で見直すことが前提です。なじむ
        の終わりの「見直しの日」に、めやすと期間を整えます。
      </p>

      <section className="step05-board step05-tl" aria-label="道のり">
        <p className="step05-board-domain">{ctx.domainLabel}</p>
        <p className="step05-board-goal">「{theme.goal.statement}」</p>
        <ScoreScale current={ctx.score} target={theme.targetScore} />
        <p className="step05-period-summary">
          {formatYMD(period.startDate)} 〜 {formatYMD(period.targetDate)}（遅くとも {formatYMD(period.targetDateLatest)}
          ）
        </p>

        <div className="step05-tl-bar" aria-hidden>
          <div className="step05-tl-track">
            {STAGES.map((s) => (
              <div
                key={s.kind}
                className={`step05-tl-band step05-tl-band--${s.kind}`}
                style={span(ranges[s.kind].start, ranges[s.kind].end)}
              >
                <span>{s.name}</span>
              </div>
            ))}
            <div
              className="step05-tl-band step05-tl-band--latest"
              style={span(addDays(period.targetDate, 1), period.targetDateLatest)}
            >
              <span>幅</span>
            </div>
            {plan.bufferWeekPerStage
              ? STAGES.map((s) => (
                  <div
                    key={`buf-${s.kind}`}
                    className="step05-tl-buffer"
                    style={span(addDays(ranges[s.kind].end, -6), ranges[s.kind].end)}
                    title="余白の週"
                  />
                ))
              : null}
            {plan.busyPeriods.map((b) => (
              <div key={b.id} className="step05-tl-busy" style={span(b.startDate, b.endDate)} title={b.reason} />
            ))}
          </div>
          <div className="step05-tl-pins">
            <span className="step05-tl-pin is-review" style={{ left: `${pos(ranges.settle.end)}%` }}>
              見直しの日
            </span>
            {plan.brakeMarks
              .filter((b) => b.stageKind)
              .map((b, i) => {
                const r = ranges[b.stageKind!];
                const mid = addDays(r.start, Math.floor(diffDays(r.start, r.end) / 2));
                return (
                  <span
                    key={b.id}
                    className="step05-tl-pin is-brake"
                    style={{ left: `${pos(mid)}%`, top: `${1.4 + i * 1.3}rem` }}
                    title={b.note || b.scene}
                  >
                    ブレーキの目印
                  </span>
                );
              })}
          </div>
          <div
            className="step05-tl-ticks"
            style={{
              marginTop: `${2.6 + Math.max(0, plan.brakeMarks.filter((b) => b.stageKind).length - 1) * 1.3}rem`,
            }}
          >
            <span style={{ left: '0%' }}>{formatMD(period.startDate)}</span>
            {monthTicks(period).map((d) => (
              <span key={d} style={{ left: `${pos(d)}%` }}>
                {Number(d.slice(5, 7))}月
              </span>
            ))}
          </div>
        </div>
        <p className="step05-tl-legend" aria-hidden>
          <span className="step05-tl-key is-buffer" />
          余白の週
          <span className="step05-tl-key is-busy" />
          忙しくなりそうな時期
          <span className="step05-tl-key is-latest" />
          達成時期の幅
        </p>

        <ol className="step05-tl-stages">
          {STAGES.map((s) => {
            const stage = stageOf(plan, s.kind);
            const r = ranges[s.kind];
            const brakes = plan.brakeMarks.filter((b) => b.stageKind === s.kind);
            const busy = plan.busyPeriods.filter(
              (b) => diffDays(b.endDate, r.start) <= 0 && diffDays(r.end, b.startDate) <= 0
            );
            return (
              <li key={s.kind} className={`step05-tl-stage step05-tl-stage--${s.kind}`}>
                <p className="step05-stage-head">
                  <span className="step05-stage-name">{s.name}</span>
                  <span className="step05-stage-range">
                    {formatMD(r.start)}〜{formatMD(r.end)}
                  </span>
                </p>
                <p className="step05-tl-milestone">節目の姿：{stage.milestone}</p>
                <p className="step05-tl-expected">
                  {plan.markers
                    .map((m) => `${m.label} ${markerValueLabel(m, stage.expected[m.id] ?? '')}`)
                    .join(' ／ ')}
                </p>
                {s.kind === 'settle' ? <p className="step05-stage-review">見直しの日：{formatMD(r.end)}</p> : null}
                {busy.map((b) => (
                  <p key={b.id} className="step05-tl-note is-busy">
                    忙しくなりそうな時期：{formatMD(b.startDate)}〜{formatMD(b.endDate)} {b.reason}
                  </p>
                ))}
                {brakes.map((b) => (
                  <p key={b.id} className="step05-tl-note is-brake">
                    ブレーキの目印：{b.note || b.scene}（場面：{b.scene}）
                  </p>
                ))}
              </li>
            );
          })}
        </ol>

        <div className="step05-tl-table-wrap">
          <table className="step05-tl-table">
            <caption>しるしの予定</caption>
            <thead>
              <tr>
                <th scope="col">しるし</th>
                <th scope="col">今</th>
                {STAGES.map((s) => (
                  <th key={s.kind} scope="col">
                    {s.name}
                  </th>
                ))}
                <th scope="col">目指す</th>
              </tr>
            </thead>
            <tbody>
              {plan.markers.map((m) => (
                <tr key={m.id}>
                  <th scope="row">
                    {m.label}
                    <small>
                      {m.role === 'response' ? '手応え' : '到達'}・{m.cadence === 'weekly' ? '毎週' : '毎月'}
                    </small>
                  </th>
                  <td>{markerValueLabel(m, m.baseline)}</td>
                  {STAGES.map((s) => (
                    <td key={s.kind}>{markerValueLabel(m, stageOf(plan, s.kind).expected[m.id] ?? '')}</td>
                  ))}
                  <td className="is-target">{markerValueLabel(m, m.target)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {others.length > 0 || situations.length > 0 ? (
          <div className="step05-tl-refs">
            {others.length > 0 ? (
              <>
                <p className="step05-marker-key">重点以外の項目（参照）</p>
                <ul className="step05-ref-list">
                  {others.map((i) => (
                    <li key={i.id}>
                      {getStep05Layer(i.layer).name}：{i.target}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {situations.length > 0 ? (
              <>
                <p className="step05-marker-key">状況の阻害（Step6 で扱います）</p>
                <ul className="step05-ref-list">
                  {situations.map((s) => (
                    <li key={s.reasonId}>
                      {s.reason?.text}
                      {s.note ? `（${s.note}）` : ''}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="step03-phase-actions">
        {plan.timelineConfirmedAt != null ? (
          <p className="step04-complete-badge">Step5 が完了しました ✓　次の Step6（行動を決める）は準備中です。</p>
        ) : (
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onConfirm}>
            この道のりで進む
          </button>
        )}
      </div>
    </div>
  );
}
