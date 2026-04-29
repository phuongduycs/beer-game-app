'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [savedRoom, setSavedRoom] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bg_teacher_room');
    if (saved) setSavedRoom(saved);
  }, []);

  function clearSavedRoom() {
    localStorage.removeItem('bg_teacher_room');
    setSavedRoom(null);
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-6xl mb-4">🍺</div>
          <h1 className="text-5xl md:text-6xl font-bold mb-3">Beer Game — IUH</h1>
          <p className="text-lg text-white/90 max-w-2xl">
            Mô phỏng chuỗi cung ứng 4 vai cho sinh viên. Tối đa 5 chuỗi × 4 nhóm × 8 SV = 160 SV/phòng.
          </p>
        </div>
      </div>

      {/* Resume banner cho GV */}
      {savedRoom && (
        <div className="max-w-5xl mx-auto px-6 -mt-6">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-yellow-900">🔄 Phòng đã tạo gần đây</div>
              <div className="text-sm text-yellow-700">
                Mã: <span className="font-mono font-bold">{savedRoom}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/teacher/dashboard/${savedRoom}`}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700">
                Vào lại dashboard →
              </Link>
              <button onClick={clearSavedRoom}
                className="bg-white border border-yellow-300 px-3 py-2 rounded-lg text-sm hover:bg-yellow-100">
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 mt-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/join"
            className="group bg-white rounded-2xl shadow-lg p-8 border-t-4 border-blue-500 card-hover">
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-bold mb-2">Sinh viên</h2>
            <p className="text-gray-600 mb-4">Vào phòng game bằng mã GV cung cấp</p>
            <div className="inline-flex items-center gap-1 text-blue-600 font-semibold group-hover:gap-2 transition-all">
              Tham gia <span>→</span>
            </div>
          </Link>

          <Link href="/teacher/create"
            className="group bg-white rounded-2xl shadow-lg p-8 border-t-4 border-purple-500 card-hover">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h2 className="text-2xl font-bold mb-2">Giảng viên</h2>
            <p className="text-gray-600 mb-4">Tạo phòng mới và điều hành trận đấu</p>
            <div className="inline-flex items-center gap-1 text-purple-600 font-semibold group-hover:gap-2 transition-all">
              Tạo phòng <span>→</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500">
          <div className="text-2xl mb-1">⏱</div>
          <div className="font-bold mb-1">Pipeline ASYNC</div>
          <div className="text-sm text-gray-600">Mỗi vai có 90s để quyết. Hết giờ → AI chốt thay.</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
          <div className="text-2xl mb-1">🚚</div>
          <div className="font-bold mb-1">Lead time 2 tuần</div>
          <div className="text-sm text-gray-600">Đặt tuần N → nhận tuần N+2. Cần lập kế hoạch trước.</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-rose-500">
          <div className="text-2xl mb-1">💰</div>
          <div className="font-bold mb-1">Tồn $1 • Thiếu $2</div>
          <div className="text-sm text-gray-600">Cân bằng giữa tồn kho và đáp ứng nhu cầu.</div>
        </div>
      </div>
    </div>
  );
}
