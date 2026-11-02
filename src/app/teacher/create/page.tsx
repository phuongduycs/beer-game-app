'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { CHAINS, formatClock } from '@/lib/types';

const CHAIN_OPTIONS = [
  { n: 2, label: '2 chuỗi', sub: '~16 SV (lớp nhỏ)', recommend: 'Dưới 25 SV' },
  { n: 3, label: '3 chuỗi', sub: '~24 SV', recommend: '25-40 SV' },
  { n: 4, label: '4 chuỗi', sub: '~32 SV', recommend: '40-60 SV' },
  { n: 5, label: '5 chuỗi', sub: '~40-200 SV', recommend: 'Trên 60 SV' },
];

const WEEK_OPTIONS = [10, 15, 20, 30];
const DECISION_OPTIONS = [60, 90, 120, 150, 210];

// 2 trận thật ngày 29/4 với 3:30 mỗi lượt mất khoảng 4 phút/tuần, tức 1,15 lần thời gian tối đa
function estimateDuration(weeks: number, decisionSeconds: number): string {
  const minutes = Math.round((weeks * decisionSeconds * 1.15) / 60);
  if (minutes < 60) return `~${minutes} phút`;
  const rest = Math.round((minutes % 60) / 5) * 5;
  return `~${Math.floor(minutes / 60)} giờ${rest > 0 ? ` ${rest}` : ''}`;
}

export default function TeacherCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chainCount, setChainCount] = useState(2);
  const [noFactoryPicked, setNoFactoryPicked] = useState(0);
  const [totalWeeks, setTotalWeeks] = useState(10);
  const [decisionSeconds, setDecisionSeconds] = useState(120);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bg_teacher_pw');
    if (saved) setPassword(saved);
  }, []);

  const noFactoryCount = Math.min(noFactoryPicked, chainCount);
  const noFactoryChains = CHAINS.slice(chainCount - noFactoryCount, chainCount);
  const groupCount = chainCount * 4 - noFactoryCount;

  function createRoom() {
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit('teacher:create', { chainCount, totalWeeks, noFactoryCount, decisionSeconds, password }, (res: { ok: boolean; roomCode?: string; error?: string }) => {
      setLoading(false);
      if (!res.ok || !res.roomCode) {
        setError(res.error || 'Không tạo được phòng.');
        return;
      }
      // Dashboard cần password để vào phòng; tab này luôn giữ, trình duyệt chỉ nhớ khi được tick
      sessionStorage.setItem('bg_teacher_pw', password);
      if (remember) localStorage.setItem('bg_teacher_pw', password);
      else localStorage.removeItem('bg_teacher_pw');
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
            <b>{groupCount} nhóm</b>, mỗi vai tối đa <b>10 SV</b>. Tối đa <b>{groupCount * 10} SV</b> trong phòng.
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-2">Số chuỗi không có Nhà máy</label>
          <div className="flex gap-2">
            {Array.from({ length: chainCount + 1 }, (_, n) => (
              <button key={n} onClick={() => setNoFactoryPicked(n)}
                className={`flex-1 border-2 rounded-xl py-2 font-bold transition-smooth ${
                  noFactoryCount === n ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}>
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {noFactoryCount === 0
              ? 'Mọi chuỗi đủ 4 vai.'
              : `Chuỗi ${noFactoryChains.join(', ')} chỉ có 3 vai: Phân phối đặt bao nhiêu nhận đúng bấy nhiêu sau 2 tuần. Xếp hạng chỉ so 3 vai chung.`}
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-2">Số tuần chơi</label>
          <div className="grid grid-cols-4 gap-2">
            {WEEK_OPTIONS.map(n => (
              <button key={n} onClick={() => setTotalWeeks(n)}
                className={`border-2 rounded-xl p-3 text-center transition-smooth ${
                  totalWeeks === n ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}>
                <div className="font-bold text-lg">{n}</div>
                <div className="text-xs text-gray-600">{estimateDuration(n, decisionSeconds)}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Thời lượng là ước tính, chưa tính lúc vào phòng. Có thể bấm Kết thúc sớm bất cứ lúc nào.
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-2">Thời gian tối đa mỗi lượt</label>
          <div className="flex gap-2">
            {DECISION_OPTIONS.map(s => (
              <button key={s} onClick={() => setDecisionSeconds(s)}
                className={`flex-1 border-2 rounded-xl py-2 font-bold transition-smooth ${
                  decisionSeconds === s ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}>
                {formatClock(s)}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Nhóm chốt sớm thì đi tiếp ngay. Hết giờ, AI chốt thay.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <button onClick={createRoom} disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 shadow-md text-lg transition-smooth">
          {loading ? '⏳ Đang tạo...' : `+ Tạo phòng (${chainCount} chuỗi, ${groupCount} nhóm, ${totalWeeks} tuần, ${formatClock(decisionSeconds)}/lượt)`}
        </button>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-1">
        <div className="font-semibold mb-1">📋 Sau khi tạo, giảng viên sẽ:</div>
        <div>① Chia mã 6 ký tự cho SV</div>
        <div>② Chờ đủ SV rồi bấm Start</div>
        <div>③ Bơm demand từng tuần cho Retailer từng chuỗi</div>
        <div>④ Theo dõi pipeline realtime, kick SV quậy nếu cần</div>
      </div>
    </div>
  );
}
