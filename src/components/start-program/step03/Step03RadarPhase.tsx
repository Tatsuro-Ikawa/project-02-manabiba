'use client';

import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts';
import { MANDALA_DOMAINS, type MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import {
  RADAR_PATTERN_GUIDE,
  STEP03_RADAR_NOTE_MAX_CHARS,
  detectRadarPattern,
  isValidSatisfactionScore,
  type DomainSatisfaction,
  type RadarNotes,
  type Step03SatisfactionStore,
} from '@/lib/startProgram/step03Constants';

type Step03RadarPhaseProps = {
  store: Step03SatisfactionStore;
  onNotesChange: (patch: Partial<RadarNotes>) => void;
  onGoFocus: () => void;
};

/** チャート描画定数（変更前後は仕様・PR コメント参照） */
const CHART_HEIGHT = 340;
/** 狭幅でもラベルが切れないよう、この幅未満では横スクロール */
const CHART_MIN_WIDTH = 400;
/**
 * outerRadius 係数（変更前 0.32 → 変更後 0.38）
 * 内側マージンを減らしレーダー本体を大きくする
 */
const CHART_OUTER_RADIUS_RATIO = 0.38;
/** 角度ラベル fontSize（変更前 11 → 変更後 13） */
const CHART_ANGLE_FONT_SIZE = 13;
/** 半径目盛 fontSize（変更前 10 → 変更後 11） */
const CHART_RADIUS_FONT_SIZE = 11;
const CHART_STROKE = '#1a5f4a';

const RADAR_ILLUSTRATION_SRC =
  '/start-program/seven-steps/step03/illustrations/radar.png';

type RadarPoint = { label: string; score: number };

function radarDataEqual(a: RadarPoint[], b: RadarPoint[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].label !== b[i].label || a[i].score !== b[i].score) return false;
  }
  return true;
}

/**
 * ResponsiveContainer は親再レンダーでサイズ再計測→ちらつくため、
 * 週次チャート同様に固定 height + ResizeObserver で幅のみ追従する。
 * 親が狭いときは CHART_MIN_WIDTH を下限にし、外側で横スクロールする。
 */
function Step03RadarChart({ data }: { data: RadarPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.max(
        CHART_MIN_WIDTH,
        Math.floor(el.getBoundingClientRect().width)
      );
      setWidth((prev) => (prev === next ? prev : next));
    };

    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="step03-radar-chart-inner"
      style={{
        width: '100%',
        minWidth: CHART_MIN_WIDTH,
        height: CHART_HEIGHT,
        minHeight: CHART_HEIGHT,
      }}
      aria-label="8領域の満足度レーダー"
    >
      {width > 0 ? (
        <RadarChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
          cx={width / 2}
          cy={CHART_HEIGHT / 2}
          outerRadius={Math.min(width, CHART_HEIGHT) * CHART_OUTER_RADIUS_RATIO}
        >
          <PolarGrid stroke="#d5d1c8" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: CHART_ANGLE_FONT_SIZE, fill: '#3a3832' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tickCount={6}
            tick={{ fontSize: CHART_RADIUS_FONT_SIZE }}
          />
          <Radar
            name="満足度"
            dataKey="score"
            stroke={CHART_STROKE}
            fill={CHART_STROKE}
            fillOpacity={0.35}
            isAnimationActive={false}
          />
        </RadarChart>
      ) : null}
    </div>
  );
}

const MemoRadarChart = memo(Step03RadarChart, (prev, next) => radarDataEqual(prev.data, next.data));

/** Phase B / Phase C で共用するレーダー本体 */
export function Step03RadarChartBlock({
  domains,
}: {
  domains: Record<MandalaDomainId, DomainSatisfaction>;
}) {
  const chartData = useMemo(
    () =>
      MANDALA_DOMAINS.map((d) => ({
        label: d.label.length > 6 ? `${d.label.slice(0, 5)}…` : d.label,
        score: isValidSatisfactionScore(domains[d.id]?.score)
          ? (domains[d.id].score as number)
          : 0,
      })),
    [domains]
  );

  return (
    <div className="step03-radar-chart-wrap">
      <MemoRadarChart data={chartData} />
    </div>
  );
}

export default function Step03RadarPhase({
  store,
  onNotesChange,
  onGoFocus,
}: Step03RadarPhaseProps) {
  const patternId = detectRadarPattern(store.domains);
  const guide = RADAR_PATTERN_GUIDE[patternId];

  return (
    <div className="step03-radar">
      <h2 className="seven-steps-worksheet-heading">満足度のバランスを俯瞰する</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        レーダーの形から、偏り・全体の低さ・一部の凹みを見てみましょう。気づきメモは任意です。
      </p>

      <Step03RadarChartBlock domains={store.domains} />

      <section className="step03-radar-pattern" aria-label="チャートの読み方">
        <h3 className="step03-sat-section-label">あなたのチャートへのヒント</h3>
        <div className="step03-radar-pattern-main">
            <div className="step03-radar-pattern-card">
              <div className="step03-radar-pattern-card-text">
                <p className="step03-radar-pattern-title">{guide.title}</p>
                <p className="step03-radar-pattern-look">{guide.look}</p>
                <p className="step03-radar-pattern-tip">{guide.tip}</p>
              </div>
              <div className="step03-radar-pattern-illust" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={RADAR_ILLUSTRATION_SRC}
                  alt=""
                  width={140}
                  height={140}
                  className="step03-radar-pattern-illust-img"
                />
              </div>
            </div>
            <details className="step03-radar-pattern-more">
              <summary>補足（クリックで表示）</summary>
              <ul className="step03-radar-pattern-all">
                {(Object.keys(RADAR_PATTERN_GUIDE) as (keyof typeof RADAR_PATTERN_GUIDE)[])
                  .filter((k) => k !== 'mixed')
                  .map((k) => (
                    <li key={k}>
                      <strong>{RADAR_PATTERN_GUIDE[k].title}</strong>
                      {' — '}
                      {RADAR_PATTERN_GUIDE[k].tip}
                    </li>
                  ))}
              </ul>
            </details>
          </div>
      </section>

      <section className="step03-radar-notes" aria-label="気づきメモ（任意）">
        <h3 className="step03-sat-section-label">気づきメモ（任意）</h3>
        <label className="step03-radar-note-field">
          <span>どこが大きく膨らみ、どこが凹んでいますか？</span>
          <textarea
            rows={2}
            value={store.radarNotes.bulge}
            maxLength={STEP03_RADAR_NOTE_MAX_CHARS}
            onChange={(e) => onNotesChange({ bulge: e.target.value })}
          />
        </label>
        <label className="step03-radar-note-field">
          <span>最もバランスを乱していると感じる領域はどこですか？</span>
          <textarea
            rows={2}
            value={store.radarNotes.imbalance}
            maxLength={STEP03_RADAR_NOTE_MAX_CHARS}
            onChange={(e) => onNotesChange({ imbalance: e.target.value })}
          />
        </label>
        <label className="step03-radar-note-field">
          <span>「この領域が整うと人生が軽くなる」と感じる箇所はどこですか？</span>
          <textarea
            rows={2}
            value={store.radarNotes.lighten}
            maxLength={STEP03_RADAR_NOTE_MAX_CHARS}
            onChange={(e) => onNotesChange({ lighten: e.target.value })}
          />
        </label>
      </section>

      <div className="step03-phase-actions">
        <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onGoFocus}>
          取組領域を決めるへ
        </button>
      </div>
    </div>
  );
}
