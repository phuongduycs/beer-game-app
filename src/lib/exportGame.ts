// Xuất kết quả game ra CSV — mở trong Excel/Google Sheets
// Tạo 1 file CSV với nhiều "section" ngăn cách bằng dòng trống.

import type { GameState, ChainKey, RoleKey } from './types';
import { ROLES, ROLE_LABELS } from './types';

const ROLE_VI: Record<RoleKey, string> = {
  retailer: 'Bán lẻ', wholesaler: 'Bán sỉ', distributor: 'Phân phối', factory: 'Nhà máy',
};

function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function row(...cells: unknown[]): string {
  return cells.map(csvEscape).join(',');
}

export function exportGameToCSV(state: GameState): string {
  const lines: string[] = [];
  const activeChains = Object.keys(state.chains) as ChainKey[];

  // Header
  lines.push(row('BEER GAME — KẾT QUẢ TRẬN ĐẤU'));
  lines.push(row('Mã phòng', state.roomCode));
  lines.push(row('Số chuỗi', activeChains.length));
  lines.push(row('Số tuần tổng', state.totalWeeks));
  lines.push(row('Trạng thái', state.status));
  lines.push(row('Thời điểm tạo', new Date(state.createdAt).toLocaleString('vi-VN')));
  lines.push(row('Thời điểm xuất', new Date().toLocaleString('vi-VN')));
  lines.push('');

  // Tổng chi phí từng chuỗi
  lines.push(row('=== BẢNG XẾP HẠNG TỔNG CHI PHÍ ==='));
  lines.push(row('Chuỗi', 'Retailer', 'Wholesaler', 'Distributor', 'Factory', 'Tổng'));
  const ranking = activeChains.map(k => {
    const c = state.chains[k];
    const costs = ROLES.map(r => c[r].cost);
    const total = costs.reduce((a, b) => a + b, 0);
    return { chain: k, costs, total };
  }).sort((a, b) => a.total - b.total);
  ranking.forEach(r => {
    lines.push(row(
      `Chuỗi ${r.chain}`,
      r.costs[0].toFixed(2),
      r.costs[1].toFixed(2),
      r.costs[2].toFixed(2),
      r.costs[3].toFixed(2),
      r.total.toFixed(2)
    ));
  });
  if (ranking.length > 0) {
    lines.push(row('', '', '', '', 'WINNER', `Chuỗi ${ranking[0].chain} — $${ranking[0].total.toFixed(2)}`));
  }
  lines.push('');

  // Danh sách thành viên
  lines.push(row('=== DANH SÁCH THÀNH VIÊN ==='));
  lines.push(row('Chuỗi', 'Vai', 'Vị trí', 'Họ và tên', 'Captain', 'Online cuối trận'));
  activeChains.forEach(chain => {
    ROLES.forEach(role => {
      const r = state.chains[chain][role];
      r.players.forEach((p, idx) => {
        lines.push(row(
          chain, ROLE_VI[role], idx + 1,
          p.name, p.isCaptain ? 'Yes' : '',
          p.online ? 'Online' : 'Offline'
        ));
      });
    });
  });
  lines.push('');

  // Demand pattern từng chuỗi
  lines.push(row('=== NHU CẦU KHÁCH HÀNG (DEMAND PATTERN) ==='));
  lines.push(row('Chuỗi', 'Tuần 1...n →'));
  activeChains.forEach(chain => {
    lines.push(row(`Chuỗi ${chain}`, ...state.demands[chain]));
  });
  lines.push('');

  // Lịch sử mỗi vai mỗi chuỗi
  activeChains.forEach(chain => {
    ROLES.forEach(role => {
      const r = state.chains[chain][role];
      if (r.history.length === 0) return;
      lines.push(row(`=== CHUỖI ${chain} — ${ROLE_LABELS[role]} ===`));
      lines.push(row(
        'Tuần', 'Nhu cầu từ đối tác', 'Tồn kho có sẵn',
        'Tồn sau khi đáp ứng', 'Thiếu hàng',
        'Đặt hàng', 'Nhận', 'Giao',
        'CP tồn kho', 'CP thiếu hàng', 'CP tuần', 'Tích lũy', 'AI quyết'
      ));
      r.history.forEach(h => {
        lines.push(row(
          h.week, h.incomingOrder, h.netAtStart,
          h.inventory, h.backlog > 0 ? -h.backlog : 0,
          h.ordered, h.received, h.shipped,
          h.holdingCost.toFixed(2), h.shortageCost.toFixed(2),
          h.weekCost.toFixed(2), h.cumCost.toFixed(2),
          h.aiDecided ? 'Yes' : ''
        ));
      });
      lines.push(row('', 'TỔNG', '', '', '', '', '', '', '', '', '', r.cost.toFixed(2)));
      lines.push('');
    });
  });

  return lines.join('\n');
}

export function downloadCSV(filename: string, content: string) {
  // BOM để Excel mở UTF-8 tiếng Việt đúng
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
