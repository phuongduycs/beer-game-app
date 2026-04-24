'use client';
import type { RoleKey, RoleRuntime } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';

const COLORS: Record<RoleKey, { border: string; text: string; bg: string; ring: string }> = {
  retailer: { border: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  wholesaler: { border: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  distributor: { border: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  factory: { border: 'border-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-200' },
};

const ICONS: Record<RoleKey, string> = {
  retailer: '🏪', wholesaler: '🏢', distributor: '🚚', factory: '🏭',
};

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: string }> = {
  idle:              { label: 'Rảnh',          cls: 'bg-slate-100 text-slate-600 border-slate-200',         icon: '💤' },
  deciding:          { label: 'Đang quyết',    cls: 'bg-orange-100 text-orange-700 border-orange-300',     icon: '⏳' },
  awaiting_upstream: { label: 'Chờ upstream',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-300',     icon: '⏸' },
};

const TIMEOUT_MS = 90_000;

function formatTimer(deadline: number | null): string {
  if (!deadline) return '';
  const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function timerRatio(deadline: number | null): number {
  if (!deadline) return 0;
  return Math.max(0, Math.min(1, (deadline - Date.now()) / TIMEOUT_MS));
}

export function RoleCard({
  role, runtime, compact = false,
}: {
  role: RoleKey;
  runtime: RoleRuntime;
  compact?: boolean;
}) {
  const c = COLORS[role];
  const net = runtime.inventory - runtime.backlog;
  const badge = STATUS_BADGE[runtime.status];
  const inTransit = runtime.shipmentsInbound.reduce((s, x) => s + x.amount, 0);
  const isDeciding = runtime.status === 'deciding';
  const ratio = timerRatio(runtime.deadline);
  const timerColor = ratio > 0.5 ? 'bg-emerald-500' : ratio > 0.25 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${c.border} p-4 card-hover transition-smooth ${isDeciding ? 'pulse-deciding' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ICONS[role]}</span>
          <h3 className={`font-bold ${c.text}`}>{ROLE_LABELS[role]}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      {/* Timer progress bar (khi deciding) */}
      {isDeciding && runtime.deadline && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-orange-700 font-semibold">⏱ Còn {formatTimer(runtime.deadline)}</span>
            <span className="text-gray-400">/ 1:30</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tuần + SV */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>
          {isDeciding
            ? <>Đang quyết tuần <b className="text-orange-700">{runtime.week + 1}</b></>
            : runtime.status === 'awaiting_upstream'
            ? <>Chờ gửi tuần {runtime.week + 1}</>
            : runtime.week === 0
            ? <>Chuẩn bị tuần <b>1</b></>
            : <>Đã xong tuần <b className="text-gray-700">{runtime.week}</b></>}
        </span>
        <span className="text-slate-400">👥 {runtime.players.length}/8</span>
      </div>

      {/* Inbox hiển thị lớn khi deciding và không compact */}
      {!compact && runtime.inbox && (
        <div className={`${c.bg} rounded-lg p-3 mb-3 border ${c.border.replace('border-', 'border-')} border-opacity-30`}>
          <div className={`text-xs ${c.text} mb-1 font-semibold`}>🔔 Đơn cần xử lý</div>
          <div className={`text-3xl font-bold ${c.text} text-center`}>{runtime.inbox.value}</div>
        </div>
      )}

      {/* Net inventory — visual */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-baseline">
          <span className="text-gray-500">Tồn có sẵn (net)</span>
          <span className={`font-bold text-xl ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {net >= 0 ? '+' : ''}{net}
          </span>
        </div>

        {/* Inventory bar */}
        <div className="flex gap-0.5 h-2">
          <div className="flex-1 bg-emerald-100 rounded-l overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min(100, runtime.inventory * 2)}%` }} />
          </div>
          <div className="flex-1 bg-rose-100 rounded-r overflow-hidden">
            <div className="bg-rose-500 h-full transition-all" style={{ width: `${Math.min(100, runtime.backlog * 4)}%` }} />
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-600">📦 {runtime.inventory}</span>
          <span className="text-rose-600">⚠️ {runtime.backlog}</span>
        </div>

        <div className="flex justify-between text-xs pt-1">
          <span className="text-gray-400">🚚 Đang về</span>
          <span className="text-blue-600 font-mono">{inTransit}</span>
        </div>

        <div className="pt-2 border-t flex justify-between items-baseline">
          <span className="text-xs text-gray-500">Chi phí tích lũy</span>
          <span className="font-bold text-rose-600">${runtime.cost.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
