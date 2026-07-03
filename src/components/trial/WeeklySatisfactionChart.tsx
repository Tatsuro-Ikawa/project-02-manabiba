'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';

export type WeeklySatisfactionChartPoint = {
  label: string;
  satisfaction: number | null;
};

const CHART_HEIGHT = 220;
const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 0 };

function chartPointsEqual(a: WeeklySatisfactionChartPoint[], b: WeeklySatisfactionChartPoint[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].label !== b[i].label || a[i].satisfaction !== b[i].satisfaction) return false;
  }
  return true;
}

/**
 * 週次「満足度の変化」折れ線。
 * ResponsiveContainer は親の再レンダーごとにサイズ再計測→clipPath 再生成でちらつくため、
 * 固定 height + ResizeObserver で幅のみ追従する。
 */
function WeeklySatisfactionChartBase({ data }: { data: WeeklySatisfactionChartPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
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
      className="weekly-satisfaction-chart-inner"
      style={{ width: '100%', height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}
    >
      {width > 0 ? (
        <LineChart width={width} height={CHART_HEIGHT} data={data} margin={CHART_MARGIN}>
          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} allowDecimals={false} width={60} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="satisfaction"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      ) : null}
    </div>
  );
}

export const WeeklySatisfactionChart = memo(WeeklySatisfactionChartBase, (prev, next) =>
  chartPointsEqual(prev.data, next.data)
);
