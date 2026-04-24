'use client';
import type { RoleRuntime, RoleKey } from '@/lib/types';

export function StrategyPanel({ role, runtime }: { role: RoleKey; runtime: RoleRuntime }) {
  const net = runtime.inventory - runtime.backlog;
  const inTransit = runtime.shipmentsInbound.reduce((s, x) => s + x.amount, 0);
  const supplyLine = net + inTransit;

  // Demand TB 4 tuần gần nhất
  const N = Math.min(4, runtime.history.length);
  const avgDemand = N > 0
    ? runtime.history.slice(-N).reduce((s, h) => s + h.incomingOrder, 0) / N
    : 0;
  const curDemand = runtime.inbox?.value ?? 0;

  // Gợi ý Anchor & Adjust
  const expected = curDemand || avgDemand || 4;
  const target = expected * 3;
  const suggested = Math.max(0, Math.round(expected + Math.max(0, target - supplyLine) / 3));

  // Các warning
  const warnings: { type: 'danger' | 'warn' | 'info'; text: string }[] = [];
  if (runtime.backlog > 0) warnings.push({ type: 'danger', text: `Bạn đang thiếu hàng ${runtime.backlog} đơn vị. Cần đặt nhiều hơn nhu cầu để bù.` });
  if (runtime.inventory > expected * 4) warnings.push({ type: 'info', text: `Tồn kho đang cao (${runtime.inventory}). Có thể giảm đơn đặt.` });
  if (inTransit > expected * 3) warnings.push({ type: 'warn', text: `Hàng đang về nhiều (${inTransit}). Tránh đặt quá tay gây bullwhip.` });
  if (runtime.history.length >= 3) {
    const recent = runtime.history.slice(-3).map(h => h.incomingOrder);
    const trend = recent[2] - recent[0];
    if (trend > 2) warnings.push({ type: 'warn', text: `Nhu cầu đang tăng (${recent.join('→')}). Cân nhắc đặt sớm hơn.` });
    if (trend < -2) warnings.push({ type: 'info', text: `Nhu cầu đang giảm (${recent.join('→')}). Cẩn thận thừa hàng.` });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <h3 className="font-bold">📊 Tính toán & gợi ý</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Nhu cầu TB 4 tuần</div>
          <div className="font-bold text-lg">{avgDemand.toFixed(1)}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Tồn − Thiếu (net)</div>
          <div className={`font-bold text-lg ${net < 0 ? 'text-red-600' : 'text-green-600'}`}>{net}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Hàng đang về</div>
          <div className="font-bold text-lg text-blue-600">{inTransit}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Supply line tổng</div>
          <div className="font-bold text-lg">{supplyLine}</div>
        </div>
      </div>

      {runtime.status === 'deciding' && (
        <div className="bg-purple-50 border border-purple-200 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-600">Gợi ý đặt (Anchor & Adjust)</div>
              <div className="text-2xl font-bold text-purple-800">{suggested}</div>
            </div>
            <div className="text-xs text-purple-700 text-right">
              <div>target = demand × 3 = {Math.round(target)}</div>
              <div>gap = {Math.max(0, Math.round(target - supplyLine))}</div>
              <div>= demand + gap/3</div>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className={`text-xs rounded p-2 border ${
              w.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
              w.type === 'warn' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {w.type === 'danger' ? '🚨' : w.type === 'warn' ? '⚠️' : 'ℹ️'} {w.text}
            </div>
          ))}
        </div>
      )}

      {runtime.status === 'deciding' && curDemand > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          <b>💡 Dự đoán:</b> Đơn bạn chốt hôm nay sẽ về kho sau <b>2 tuần</b>.
          Ví dụ nếu đặt {suggested}, đến tuần {runtime.week + 3} sẽ nhận được.
        </div>
      )}
    </div>
  );
}
