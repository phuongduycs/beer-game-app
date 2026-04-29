'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { useGameState } from '@/lib/useGame';
import { RoleCard } from '@/components/RoleCard';
import { ChatPanel } from '@/components/ChatPanel';
import { StrategyPanel } from '@/components/StrategyPanel';
import { HistoryTable } from '@/components/HistoryTable';
import { TipsPanel } from '@/components/TipsPanel';
import type { ChainKey, RoleKey } from '@/lib/types';

interface PlayerSession {
  roomCode: string; name: string; chain: ChainKey; role: RoleKey; playerId: string;
}

export default function PlayPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [pending, setPending] = useState(4);
  const state = useGameState(); // tự tick mỗi giây

  useEffect(() => {
    const raw = sessionStorage.getItem('bg_player');
    if (!raw) { router.push('/join'); return; }
    const s = JSON.parse(raw) as PlayerSession;
    if (s.roomCode !== roomCode) { router.push('/join'); return; }
    setSession(s);

    // Auto reconnect — emit player:join để server gắn socket mới với player record cũ
    const socket = getSocket();
    socket.emit('player:join', {
      roomCode: s.roomCode, name: s.name, chain: s.chain, role: s.role,
    }, (res: { ok: boolean; playerId?: string; error?: string }) => {
      if (!res.ok) {
        alert('Không vào lại được phòng: ' + (res.error || 'lỗi không rõ'));
        sessionStorage.removeItem('bg_player');
        router.push('/join');
        return;
      }
      if (res.playerId) {
        const updated = { ...s, playerId: res.playerId };
        sessionStorage.setItem('bg_player', JSON.stringify(updated));
        setSession(updated);
      }
    });
  }, [roomCode, router]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (msg: string) => {
      alert(msg || 'Bạn đã bị xoá khỏi phòng');
      sessionStorage.removeItem('bg_player');
      router.push('/');
    };
    socket.on('kicked', handler);
    return () => { socket.off('kicked', handler); };
  }, [router]);

  if (!session || !state) return <div className="p-8">Đang kết nối...</div>;

  const chain = state.chains[session.chain];
  if (!chain) return <div className="p-8">Chuỗi {session.chain} không tồn tại trong phòng này.</div>;
  const myRole = chain[session.role];
  const me = myRole.players.find(p => p.id === session.playerId);
  const isCaptain = !!me?.isCaptain;
  const socket = getSocket();
  const status = myRole.status;
  const canSubmit = isCaptain && status === 'deciding' && !!myRole.inbox;
  const timeLeft = myRole.deadline ? Math.max(0, Math.ceil((myRole.deadline - Date.now()) / 1000)) : 0;

  function suggest() { socket.emit('player:suggest', { value: pending }); }
  function submit() {
    socket.emit('player:submit', { value: pending }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) alert(res.error || 'Không chốt được');
    });
  }

  const lobby = state.status === 'lobby';
  const gameOver = state.status === 'ended';

  return (
    <div className="max-w-5xl mx-auto p-4">
      <header className={`bg-white rounded-xl shadow-sm p-5 mb-4 flex items-center justify-between flex-wrap gap-4 border-l-4 ${
        status === 'deciding' ? 'border-orange-500' : status === 'awaiting_upstream' ? 'border-yellow-500' : 'border-slate-300'
      }`}>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Phòng</div>
          <div className="font-mono font-bold text-lg text-purple-700">{roomCode}</div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Bạn là</div>
          <div className="font-semibold text-base flex items-center gap-2">
            {session.name}
            {isCaptain && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-300">👑 Captain</span>}
          </div>
          <div className="text-sm text-gray-500">Chuỗi {session.chain} — {session.role}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Tiến độ</div>
          <div className="font-bold text-lg">
            <span className="text-emerald-600">{myRole.week}</span>
            <span className="text-gray-400"> / {state.totalWeeks}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full w-24 mt-1 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(myRole.week / state.totalWeeks) * 100}%` }} />
          </div>
        </div>
        {status === 'deciding' && (
          <div className="bg-gradient-to-r from-orange-50 to-rose-50 px-5 py-3 rounded-lg border border-orange-200">
            <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide">⏱ Còn lại</div>
            <div className={`text-3xl font-mono font-bold ${timeLeft < 30 ? 'text-rose-700' : 'text-orange-700'}`}>
              {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
            </div>
          </div>
        )}
      </header>

      {lobby && <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm mb-4">Chờ giảng viên bấm Start.</div>}
      {gameOver && <div className="bg-gray-100 p-3 rounded text-sm mb-4">🏁 Game đã kết thúc. Tổng chi phí vai: ${myRole.cost.toFixed(0)}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <RoleCard role={session.role} runtime={myRole} />

          <div className={`rounded-xl shadow-sm p-5 border-2 transition-smooth ${
            status === 'deciding' ? 'bg-white border-orange-300' :
            status === 'awaiting_upstream' ? 'bg-yellow-50 border-yellow-300' :
            'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold mb-3 text-lg flex items-center gap-2">
              {status === 'deciding' ? '✍️' : status === 'awaiting_upstream' ? '⏸' : '💤'} Lệnh đặt
            </h3>
            {status === 'idle' && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
                <div className="text-4xl mb-2">⏳</div>
                <div className="text-sm text-slate-600">Đang chờ đơn hàng...</div>
                <div className="text-xs text-slate-400 mt-1">
                  {session.role === 'retailer' ? 'GV chưa bơm demand cho Retailer' : 'Downstream chưa chốt đơn'}
                </div>
              </div>
            )}
            {status === 'awaiting_upstream' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⏸</div>
                  <div>
                    <div className="font-semibold text-yellow-800">Đã chốt lệnh: <span className="text-xl">{myRole.decidedValue}</span></div>
                    <div className="text-sm text-yellow-700">Đợi upstream rảnh để gửi đơn...</div>
                  </div>
                </div>
              </div>
            )}
            {status === 'deciding' && (
              <>
                <div className="flex gap-2 items-center mb-4 flex-wrap">
                  <input type="number" min={0} value={pending}
                    onChange={e => setPending(Math.max(0, parseInt(e.target.value) || 0))}
                    className="border-2 border-orange-300 rounded-lg px-4 py-3 w-28 text-3xl font-mono text-center font-bold focus:outline-none focus:border-orange-500" />
                  <button onClick={suggest}
                    className="border-2 border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-smooth">
                    💭 Gợi ý
                  </button>
                  {canSubmit ? (
                    <button onClick={submit}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-smooth flex-1 md:flex-none">
                      ✓ Chốt lệnh
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500 bg-slate-100 px-3 py-2 rounded">
                      👑 Chỉ captain được chốt
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="text-xs text-gray-500 mb-2 font-semibold">💬 Đề xuất từ nhóm ({myRole.suggestions.length}):</div>
                  {myRole.suggestions.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center py-2">Chưa có đề xuất. Các SV hãy gửi gợi ý!</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {myRole.suggestions.map(s => (
                        <div key={s.playerId} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                          <div className="text-xs text-slate-500 truncate">{s.playerName}</div>
                          <div className="font-mono font-bold text-lg text-slate-700">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <StrategyPanel role={session.role} runtime={myRole} />

          <HistoryTable runtime={myRole} />

          <TipsPanel role={session.role} />

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-bold text-base">👥 Thành viên nhóm</h3>
              <div className="text-xs text-gray-500">
                <span className="text-emerald-600 font-semibold">{myRole.players.filter(p => p.online).length}</span>
                <span> online</span>
                <span className="text-gray-400"> / {myRole.players.length} tổng / max 8</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {myRole.players.map((p, idx) => {
                const isMe = p.id === session.playerId;
                return (
                  <div key={p.id}
                    className={`relative rounded-lg p-3 text-sm border-2 transition-smooth ${
                      p.isCaptain ? 'border-yellow-400 bg-yellow-50' :
                      isMe ? 'border-blue-400 bg-blue-50' :
                      'border-gray-200 bg-white'
                    } ${!p.online ? 'opacity-60' : ''}`}>
                    <div className="absolute top-1.5 right-1.5">
                      <span className={`w-2 h-2 rounded-full inline-block ${p.online ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                    </div>
                    <div className="text-xs text-gray-400 mb-0.5">#{idx + 1}</div>
                    {p.isCaptain && <div className="text-base leading-none mb-1">👑</div>}
                    <div className="font-semibold break-words">{p.name}{isMe && <span className="text-blue-600 text-xs"> (bạn)</span>}</div>
                    <div className={`text-xs mt-0.5 ${p.online ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {p.online ? 'online' : 'offline'}
                    </div>
                  </div>
                );
              })}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 8 - myRole.players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-lg p-3 text-sm border-2 border-dashed border-gray-200 text-center text-gray-300 flex items-center justify-center">
                  Trống
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              👑 Captain (chốt lệnh) • <span className="text-blue-600">Bạn</span> {myRole.captainId === session.playerId ? '(captain)' : '(thành viên)'}
            </div>
          </div>
        </div>

        <ChatPanel messages={state.chatMessages} chain={session.chain} role={session.role} currentPlayerId={session.playerId} />
      </div>
    </div>
  );
}
