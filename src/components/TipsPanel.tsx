'use client';
import { useState } from 'react';
import type { RoleKey } from '@/lib/types';

const ROLE_TIPS: Record<RoleKey, string[]> = {
  retailer: [
    'Bạn tiếp xúc trực tiếp với khách — demand có thể biến động mạnh.',
    'Đừng chỉ đặt bằng demand hiện tại. Nghĩ tới 2 tuần sau hàng mới về.',
    'Nếu có backlog, đặt thêm phần bù. Công thức: ordered = demand + backlog + buffer.',
  ],
  wholesaler: [
    'Bạn thấy đơn R. Đừng phản ứng quá mạnh khi R đột ngột đặt nhiều — có thể chỉ là cú shock 1 lần.',
    'Nhớ: đơn bạn đặt cho D cần 2 tuần mới về kho. Lập kế hoạch sớm.',
  ],
  distributor: [
    'Ở giữa chuỗi — bạn chịu "khuếch đại kép" từ R và W. Cẩn thận bullwhip.',
    'Quan sát trend đơn đến. Nếu đang tăng đều, bình tĩnh đặt thêm từng chút.',
  ],
  factory: [
    'Bạn tự sản xuất — lệnh sản xuất cũng mất 2 tuần mới thành kho.',
    'Dễ bị "thừa kho khủng" nếu phản ứng quá mạnh. Kho đầu 33, đủ đệm 3-4 tuần.',
  ],
};

const GENERAL_TIPS = [
  '📊 Kiểm tra "Supply line tổng" — đó là tất cả hàng bạn đang có + đang về. Tránh đặt nếu supply line đã dư.',
  '⚖️ Chi phí tồn kho ($1) RẺ hơn chi phí thiếu hàng ($2) — khi do dự, ưu tiên có tồn kho an toàn.',
  '🎯 Chiến lược Base-stock: đặt = demand + (target − supply_line). Target thường là 2-4 tuần demand.',
  '🚫 Tránh "over-correction": thấy thiếu → đặt rất nhiều → 2 tuần sau hàng về ào ào → thừa kho đắt tiền.',
  '📈 Bullwhip: đi xa khách, biến động đơn càng lớn. Upstream cần "lọc nhiễu" thay vì phản ứng tức thì.',
];

export function TipsPanel({ role }: { role: RoleKey }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg shadow">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
        <span className="font-bold">💡 Gợi ý chiến lược</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          <div>
            <div className="font-semibold text-sm mb-1">Cho vai {role}:</div>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {ROLE_TIPS[role].map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-sm mb-1">Chung:</div>
            <ul className="list-none pl-0 space-y-1 text-gray-700">
              {GENERAL_TIPS.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
            <b>Luật cốt lõi:</b> Lead time 2 tuần • Tồn $1/tuần • Thiếu $2/tuần • Captain cố định 1 người chốt trong 3:30, hết giờ AI thay • Chỉ 1 đơn / link tại 1 thời điểm.
          </div>
        </div>
      )}
    </div>
  );
}
