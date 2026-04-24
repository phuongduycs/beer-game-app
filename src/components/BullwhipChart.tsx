'use client';
import type { ChainRuntime, RoleKey } from '@/lib/types';
import { ROLES } from '@/lib/types';

const COLORS: Record<RoleKey, string> = {
  retailer: '#3b82f6', wholesaler: '#10b981', distributor: '#f59e0b', factory: '#ef4444',
};

export function BullwhipChart({ chain, demand, title }: { chain: ChainRuntime; demand: number[]; title: string }) {
  const width = 600, height = 220, padding = 40;
  const weeks = Math.max(demand.length, ...ROLES.map(r => chain[r].history.length));
  if (weeks === 0) return <div className="text-gray-400 text-sm text-center py-8">Chưa có dữ liệu</div>;
  const allOrders = ROLES.flatMap(r => chain[r].history.map(h => h.ordered));
  const maxY = Math.max(10, ...allOrders, ...demand);
  const xS = (w: number) => padding + (w / Math.max(1, weeks - 1)) * (width - 2 * padding);
  const yS = (y: number) => height - padding - (y / maxY) * (height - 2 * padding);
  const line = (pts: { x: number; y: number }[]) => pts.map((p, i) => (i === 0 ? 'M' : 'L') + xS(p.x) + ' ' + yS(p.y)).join(' ');

  return (
    <div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="border rounded">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ccc" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ccc" />
        {[0, maxY / 2, maxY].map((y, i) => (
          <g key={i}>
            <text x={padding - 5} y={yS(y) + 4} textAnchor="end" fontSize="9" fill="#666">{Math.round(y)}</text>
            <line x1={padding} y1={yS(y)} x2={width - padding} y2={yS(y)} stroke="#f0f0f0" />
          </g>
        ))}
        <path d={line(demand.map((d, i) => ({ x: i, y: d })))} stroke="#6b7280" fill="none" strokeWidth="2" strokeDasharray="4 3" />
        {ROLES.map(r => {
          const pts = chain[r].history.map(h => ({ x: h.week - 1, y: h.ordered }));
          return <path key={r} d={line(pts)} stroke={COLORS[r]} fill="none" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}
