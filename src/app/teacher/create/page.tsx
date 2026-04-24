'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';

const CHAIN_OPTIONS = [
  { n: 2, label: '2 chuỗi', sub: '~16 SV (lớp nhỏ)', recommend: 'Dưới 25 SV' },
  { n: 3, label: '3 chuỗi', sub: '~24 SV', recommend: '25-40 SV' },
  { n: 4, label: '4 chuỗi', sub: '~32 SV', recommend: '40-60 SV' },
  { n: 5, label: '5 chuỗi', sub: '~40-160 SV', recommend: 'Trên 60 SV' },
];

export default function TeacherCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chainCount, setChainCount] = useState(2);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bg_teacher_pw');
    if (saved) setPassword(saved);
  }, []);

  function createRoom() {
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit('teacher:create', { chainCount, password }, (res: { ok: boolean; roomCode?: string; error?: string }) => {
      setLoading(false);
      if (!res.ok || !res.roomCode) {
        setError(res.error || 'Không tạo được phòng.');
        return;
      }
      if (remember && password) localStorage.setItem('bg_teacher_pw', password);
      router.push(`/teacher/dashboard/${res.roomCode}`);
    });
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">👨‍🏫</div>
        <h1 className="text-3xl font-bold">Tạo phòng mới</h1>
        <p className="text-gray-500 text-sm mt-1">Dành cho giảng viên</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
        <div>
          <label className="block font-semibold mb-2">🔒 Password giảng viên</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Nhập password"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg" />
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Nhớ password trên trình duyệt này
          </label>
        </div>

        <div>
          <label className="block font-semibold mb-2">Số chuỗi cung ứng</label>
          <div className="grid grid-cols-2 gap-2">
            {CHAIN_OPTIONS.map(opt => (
              <button key={opt.n} onClick={() => setChainCount(opt.n)}
                className={`text-left border-2 rounded-xl p-3 transition-smooth ${
                  chainCount === opt.n ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}>
                <div className="font-bold text-lg">{opt.label}</div>
                <div className="text-xs text-gray-600">{opt.sub}</div>
                <div className="text-xs text-purple-600 mt-1">{opt.recommend}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Mỗi chuỗi 4 vai (R/W/D/F), mỗi vai tối đa <b>8 SV</b>. Tối đa <b>{chainCount * 4 * 8} SV</b> trong phòng.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <button onClick={createRoom} disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 shadow-md text-lg transition-smooth">
          {loading ? '⏳ Đang tạo...' : `+ Tạo phòng (${chainCount} chuỗi)`}
        </button>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-1">
        <div className="font-semibold mb-1">📋 Sau khi tạo, thầy sẽ:</div>
        <div>① Chia mã 6 ký tự cho SV</div>
        <div>② Chờ đủ SV rồi bấm Start</div>
        <div>③ Bơm demand từng tuần cho Retailer từng chuỗi</div>
        <div>④ Theo dõi pipeline realtime, kick SV quậy nếu cần</div>
      </div>
    </div>
  );
}
