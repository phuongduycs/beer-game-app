'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { ROLE_LABELS, CHAINS, MAX_NAME_LENGTH } from '@/lib/types';
import type { ChainKey, RoleKey } from '@/lib/types';

export default function JoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [chain, setChain] = useState<ChainKey>('A');
  const [role, setRole] = useState<RoleKey>('retailer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function join() {
    if (!roomCode.trim() || !name.trim()) {
      setError('Vui lòng nhập đủ mã phòng và tên.');
      return;
    }
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit(
      'player:join',
      { roomCode: roomCode.trim().toUpperCase(), name: name.trim().slice(0, MAX_NAME_LENGTH), chain, role },
      (res: { ok: boolean; playerId?: string; error?: string }) => {
        setLoading(false);
        if (!res.ok) { setError(res.error || 'Lỗi không xác định'); return; }
        sessionStorage.setItem('bg_player', JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(), name: name.trim().slice(0, MAX_NAME_LENGTH),
          chain, role, playerId: res.playerId,
        }));
        router.push(`/play/${roomCode.trim().toUpperCase()}`);
      }
    );
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🍺</div>
        <h1 className="text-3xl font-bold">Tham gia Beer Game</h1>
        <p className="text-gray-500 text-sm mt-1">Nhập thông tin để vào phòng</p>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Mã phòng</label>
          <input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="VD: ABC123" maxLength={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono uppercase text-lg" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Tên của bạn</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="VD: Nguyễn Văn A" maxLength={MAX_NAME_LENGTH}
            className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          <div className="text-xs text-gray-400 mt-1">Tối đa {MAX_NAME_LENGTH} ký tự</div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Chuỗi cung ứng</label>
          <div className="grid grid-cols-5 gap-1">
            {CHAINS.map(c => (
              <button key={c} onClick={() => setChain(c)}
                className={`py-2 rounded-lg border font-semibold transition-smooth ${
                  chain === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-400'
                }`}>
                {c}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-1">Chỉ chọn được chuỗi mà GV đã kích hoạt</div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Vai trò</label>
          <select value={role} onChange={e => setRole(e.target.value as RoleKey)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2">
            {(Object.entries(ROLE_LABELS) as [RoleKey, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Tối đa 8 SV/vai. Người vào đầu tiên làm captain.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded-lg">{error}</div>}

        <button onClick={join} disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 shadow-md transition-smooth">
          {loading ? '⏳ Đang vào...' : 'Vào phòng →'}
        </button>
      </div>
    </div>
  );
}
