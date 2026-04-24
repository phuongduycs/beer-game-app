'use client';
import type { RoleRuntime } from '@/lib/types';

export function HistoryTable({ runtime }: { runtime: RoleRuntime }) {
  const history = runtime.history;
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center text-gray-400 text-sm">
        Chưa có tuần nào hoàn thành. Lịch sử sẽ hiện ở đây sau khi bạn chốt lệnh.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-2">📜 Lịch sử của bạn ({history.length} tuần)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left">Tuần</th>
              <th className="px-2 py-1 text-right">Nhu cầu</th>
              <th className="px-2 py-1 text-right">Nhận</th>
              <th className="px-2 py-1 text-right">Giao</th>
              <th className="px-2 py-1 text-right">Tồn</th>
              <th className="px-2 py-1 text-right">Thiếu</th>
              <th className="px-2 py-1 text-right">Đặt</th>
              <th className="px-2 py-1 text-right">CP tuần</th>
              <th className="px-2 py-1 text-right">Tích lũy</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(-10).map(h => (
              <tr key={h.week} className={`border-t ${h.backlog > 0 ? 'bg-red-50' : ''}`}>
                <td className="px-2 py-1 font-semibold">
                  {h.week}{h.aiDecided && <span className="ml-1 text-purple-600" title="AI chốt thay">🤖</span>}
                </td>
                <td className="px-2 py-1 text-right">{h.incomingOrder}</td>
                <td className="px-2 py-1 text-right text-blue-600">{h.received}</td>
                <td className="px-2 py-1 text-right text-green-600">{h.shipped}</td>
                <td className="px-2 py-1 text-right">{h.inventory}</td>
                <td className="px-2 py-1 text-right text-red-600">{h.backlog > 0 ? -h.backlog : 0}</td>
                <td className="px-2 py-1 text-right font-bold">{h.ordered}</td>
                <td className="px-2 py-1 text-right">${h.weekCost.toFixed(0)}</td>
                <td className="px-2 py-1 text-right font-semibold">${h.cumCost.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {history.length > 10 && <div className="text-xs text-gray-400 mt-1">Chỉ hiển thị 10 tuần gần nhất</div>}
    </div>
  );
}
