import { useMemo } from 'react';

import type { PricePoint } from './api';

/** 轻量 SVG 折线，避免为一张小图引入完整图表库 */
export function PriceChart({ prices }: { prices: PricePoint[] }) {
  const points = useMemo(() => prices.slice(-120), [prices]);

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-line text-xs text-subtle">
        暂无足够的价格数据
      </div>
    );
  }

  const values = points.map((point) => point.c);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 600;
  const height = 160;
  const padding = 8;

  const coordinates = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.c - min) / range) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M ${coordinates.join(' L ')}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-subtle">
        <span>收盘价走势 · 最近 {points.length} 个交易日</span>
        <span>
          {min.toFixed(2)} – {max.toFixed(2)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full text-accent"
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill="currentColor" opacity="0.08" />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-subtle">
        <span>{points[0]?.d}</span>
        <span>{points[points.length - 1]?.d}</span>
      </div>
    </div>
  );
}
