'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { useGameState } from '@/lib/useGame';
import { RoleCard } from '@/components/RoleCard';
import { BullwhipChart } from '@/components/BullwhipChart';
import type { ChainKey, RoleKey, ChainRuntime, GameState, Player } from '@/lib/types';
import { ROLES } from '@/lib/types';

type TabKey = 'overview' | 'members' | ChainKey;

export default function TeacherDashboard() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const state = useGameState();
  const socket = getSocket();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [demandInputs, setDemandInputs] = useState<Record<string, number>>({});
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const password = localStorage.getItem('bg_teacher_pw') || '';
    socket.emit('teacher:join', { roomCode, password }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) {
        setAuthError(res.error || 'Không vào được phòng');
      } else {
        // Lưu room code để landing page nhớ
        localStorage.setItem('bg_teacher_room', roomCode);
      }
    });
  }, [roomCode, socket]);

  if (authError) {
    return (
      <div className="max-w-md mx-auto p-8">
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
          <div className="text-3xl mb-2">🚫</div>
          <div className="font-bold text-red-800 mb-2">Không vào được phòng</div>
          <div className="text-sm text-red-700 mb-4">{authError}</div>
          <a href="/teacher/create" className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg">Tạo phòng mới</a>
        </div>
      </div>
    );
  }

  if (!state) return <div className="p-8">Đang kết nối...</div>;

  const activeChains = Object.keys(state.chains) as ChainKey[];
  const lobby = state.status === 'lobby';
  const gameOver = state.status === 'ended';

  function startGame() { socket.emit('teacher:startGame'); }
  function reset() { if (confirm('Reset toàn bộ game về tuần 1? (Giữ SV)')) socket.emit('teacher:reset'); }
  function sendDemand(chain: ChainKey, value: number) {
    socket.emit('teacher:sendDemand', { chain, value }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) alert(res.error || 'Không gửi được');
    });
  }
  function kick(playerId: string, playerName: string) {
    if (confirm(`Kick ${playerName} khỏi phòng?`)) socket.emit('teacher:kickPlayer', { playerId });
  }

  const totalByChain: Record<string, number> = {};
  activeChains.forEach(k => {
    totalByChain[k] = ROLES.reduce((s, r) => s + state.chains[k][r].cost, 0);
  });
  const grandTotal = Object.values(totalByChain).reduce((a, b) => a + b, 0);
  const totalPlayers = activeChains.reduce((sum, k) =>
    sum + ROLES.reduce((s, r) => s + state.chains[k][r].players.length, 0), 0);
  const onlinePlayers = activeChains.reduce((sum, k) =>
    sum + ROLES.reduce((s, r) => s + state.chains[k][r].players.filter(p => p.online).length, 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm p-5 mb-4 flex items-center gap-6 flex-wrap border-l-4 border-purple-500">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Mã phòng</div>
          <div className="font-mono font-bold text-3xl text-purple-700 tracking-wider">{roomCode}</div>
          <div className="text-xs text-gray-400">{activeChains.length} chuỗi • Tối đa {activeChains.length * 4 * 8} SV</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Trạng thái</div>
          <div className="font-bold text-lg mt-1">
            {lobby ? <span className="text-yellow-600">⏸ Chờ Start</span>
              : gameOver ? <span className="text-gray-600">🏁 Kết thúc</span>
              : <span className="text-emerald-600">▶ Đang chạy</span>}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Tổng CP toàn chuỗi</div>
          <div className="font-bold text-lg text-rose-600">${grandTotal.toFixed(0)}</div>
        </div>
        <div className="flex-1" />
        {lobby && (
          <button onClick={startGame}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-emerald-700 shadow-md transition-smooth">
            ▶ Start Game
          </button>
        )}
        {!lobby && (
          <button onClick={reset}
            className="bg-rose-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-rose-700 shadow-md">
            ⟲ Reset
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          📊 Tổng quan
        </TabBtn>
        <TabBtn active={activeTab === 'members'} onClick={() => setActiveTab('members')}>
          👥 Thành viên ({totalPlayers})
        </TabBtn>
        {activeChains.map(k => (
          <TabBtn key={k} active={activeTab === k} onClick={() => setActiveTab(k)}>
            🔗 Chuỗi {k} (${totalByChain[k].toFixed(0)})
          </TabBtn>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeChains.map(k => (
              <ChainPanel key={k} chain={k} state={state} total={totalByChain[k]}
                demandInput={demandInputs[k] ?? 6}
                setDemandInput={v => setDemandInputs({ ...demandInputs, [k]: v })}
                sendDemand={sendDemand} lobby={lobby} gameOver={gameOver} />
            ))}
          </div>
        </div>
      )}

      {/* All members tab */}
      {activeTab === 'members' && (
        <AllMembers state={state} activeChains={activeChains} kick={kick} totalPlayers={totalPlayers} onlinePlayers={onlinePlayers} />
      )}

      {/* Single chain detail */}
      {activeTab !== 'overview' && activeTab !== 'members' && (
        <ChainDetail chain={activeTab as ChainKey} state={state} kick={kick} />
      )}
    </div>
  );
}

function AllMembers({ state, activeChains, kick, totalPlayers, onlinePlayers }: {
  state: GameState; activeChains: ChainKey[];
  kick: (id: string, name: string) => void;
  totalPlayers: number; onlinePlayers: number;
}) {
  const ROLE_ICONS = { retailer: '🏪', wholesaler: '🏢', distributor: '🚚', factory: '🏭' } as const;
  const ROLE_VI: Record<RoleKey, string> = {
    retailer: 'Bán lẻ', wholesaler: 'Bán sỉ', distributor: 'Phân phối', factory: 'Nhà máy',
  };
  const [view, setView] = useState<'group' | 'table'>('group');

  // Dòng phẳng cho table view
  const allRows: { chain: ChainKey; role: RoleKey; player: import('@/lib/types').Player; idx: number }[] = [];
  activeChains.forEach(chain => {
    ROLES.forEach(role => {
      state.chains[chain][role].players.forEach((player, idx) => {
        allRows.push({ chain, role, player, idx: idx + 1 });
      });
    });
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-6 flex-wrap">
        <div>
          <div className="text-xs text-gray-500 uppercase">Tổng tham gia</div>
          <div className="text-3xl font-bold text-purple-700">{totalPlayers}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Đang online</div>
          <div className="text-3xl font-bold text-emerald-600">{onlinePlayers}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Offline</div>
          <div className="text-3xl font-bold text-gray-400">{totalPlayers - onlinePlayers}</div>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
          <button onClick={() => setView('group')}
            className={`px-3 py-1 rounded text-sm ${view === 'group' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            Theo nhóm
          </button>
          <button onClick={() => setView('table')}
            className={`px-3 py-1 rounded text-sm ${view === 'table' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            Bảng phẳng (điểm danh)
          </button>
        </div>
      </div>

      {view === 'group' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeChains.map(chain => (
            <div key={chain} className="bg-white rounded-xl shadow-sm p-4">
              <div className="font-bold text-lg mb-3 text-purple-700">🔗 Chuỗi {chain}</div>
              <div className="space-y-3">
                {ROLES.map(role => {
                  const r = state.chains[chain][role];
                  const onlineCount = r.players.filter(p => p.online).length;
                  return (
                    <div key={role} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">
                          {ROLE_ICONS[role]} {ROLE_VI[role]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {onlineCount}/{r.players.length} online
                        </div>
                      </div>
                      {r.players.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">Chưa có SV nào</div>
                      ) : (
                        <div className="space-y-1">
                          {r.players.map((p, idx) => (
                            <div key={p.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm ${p.online ? 'bg-emerald-50' : 'bg-gray-50 opacity-70'}`}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-xs text-gray-400 flex-shrink-0">#{idx + 1}</span>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.online ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                {p.isCaptain && <span title="Captain" className="flex-shrink-0">👑</span>}
                                <span className="break-words font-medium">{p.name}</span>
                              </div>
                              <button onClick={() => kick(p.id, p.name)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs px-2 py-0.5 rounded flex-shrink-0">
                                Kick
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'table' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                  <th className="px-3 py-2 text-left font-semibold">Họ và tên</th>
                  <th className="px-3 py-2 text-left font-semibold">Chuỗi</th>
                  <th className="px-3 py-2 text-left font-semibold">Vai</th>
                  <th className="px-3 py-2 text-left font-semibold">Vị trí</th>
                  <th className="px-3 py-2 text-center font-semibold">Captain</th>
                  <th className="px-3 py-2 text-center font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {allRows.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Chưa có SV nào tham gia</td></tr>
                )}
                {allRows.map((row, i) => (
                  <tr key={row.player.id} className={`border-b hover:bg-gray-50 ${row.player.online ? '' : 'opacity-60'}`}>
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 ${row.player.online ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${row.player.online ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {row.player.online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{row.player.name}</td>
                    <td className="px-3 py-2 font-mono">{row.chain}</td>
                    <td className="px-3 py-2">{ROLE_ICONS[row.role]} {ROLE_VI[row.role]}</td>
                    <td className="px-3 py-2 text-gray-500">#{row.idx}</td>
                    <td className="px-3 py-2 text-center">{row.player.isCaptain ? '👑' : ''}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => kick(row.player.id, row.player.name)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs px-2 py-1 rounded">
                        Kick
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-smooth ${
        active ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
      }`}>
      {children}
    </button>
  );
}

function ChainPanel({
  chain, state, total, demandInput, setDemandInput, sendDemand, lobby, gameOver,
}: {
  chain: ChainKey; state: GameState; total: number; demandInput: number;
  setDemandInput: (v: number) => void; sendDemand: (c: ChainKey, v: number) => void;
  lobby: boolean; gameOver: boolean;
}) {
  const c: ChainRuntime = state.chains[chain];
  const retailerBusy = c.retailer.status !== 'idle' || c.retailer.inbox != null;
  const demands = state.demands[chain];
  const ICONS = { retailer: '🏪', wholesaler: '🏢', distributor: '🚚', factory: '🏭' } as const;
  const statusColor = {
    idle: 'bg-slate-100 text-slate-600 border-slate-200',
    deciding: 'bg-orange-100 text-orange-800 border-orange-300',
    awaiting_upstream: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-bold text-lg text-purple-700">🔗 Chuỗi {chain}</div>
        <div className="text-sm">CP: <span className="font-bold text-rose-600">${total.toFixed(0)}</span></div>
      </div>

      <div className="flex items-stretch gap-0.5 mb-3">
        {ROLES.map((r, i) => {
          const rt = c[r];
          return (
            <div key={r} className="flex items-stretch flex-1">
              <div className={`flex-1 rounded p-1.5 border text-center text-xs transition-smooth ${statusColor[rt.status]}`}>
                <div className="text-sm leading-none">{ICONS[r]}</div>
                <div className="text-xs mt-0.5 font-semibold">{r.slice(0, 4)}</div>
                <div className="text-xs">
                  {rt.status === 'deciding' ? `T${rt.week + 1}` : rt.week === 0 ? 'T1' : `✓T${rt.week}`}
                </div>
                {rt.inbox && <div className="mt-0.5 text-xs font-bold">📨{rt.inbox.value}</div>}
              </div>
              {i < ROLES.length - 1 && <div className="flex items-center px-0.5 text-gray-300">→</div>}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-lg p-2">
        <div className="text-xs font-semibold text-gray-700 mb-1">🛒 Bơm demand → R</div>
        <div className="flex gap-1 items-center flex-wrap">
          <input type="number" min={0} value={demandInput}
            onChange={e => setDemandInput(Math.max(0, parseInt(e.target.value) || 0))}
            onKeyDown={e => e.key === 'Enter' && !retailerBusy && !lobby && !gameOver && sendDemand(chain, demandInput)}
            className="border border-gray-300 rounded px-2 py-1 w-16 font-mono text-center" />
          <button onClick={() => sendDemand(chain, demandInput)}
            disabled={lobby || gameOver || retailerBusy}
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:bg-gray-300">
            Gửi
          </button>
          {[4, 8, 12].map(v => (
            <button key={v} onClick={() => setDemandInput(v)}
              className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-purple-50">{v}</button>
          ))}
        </div>
        {retailerBusy && <div className="text-xs text-orange-600 mt-1">⏸ R đang bận</div>}
        <div className="text-xs text-gray-500 mt-1">{demands.length} demand: [{demands.slice(-6).join(', ')}{demands.length > 6 ? '...' : ''}]</div>
      </div>
    </div>
  );
}

function ChainDetail({ chain, state, kick }: { chain: ChainKey; state: GameState; kick: (id: string, name: string) => void }) {
  const c = state.chains[chain];
  const demands = state.demands[chain];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ROLES.map(r => (
          <div key={r} className="space-y-2">
            <RoleCard role={r} runtime={c[r]} />
            <PlayersList players={c[r].players} kick={kick} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4">
        <BullwhipChart chain={c} demand={demands} title={`Bullwhip — Chuỗi ${chain}`} />
      </div>
    </div>
  );
}

function PlayersList({ players, kick }: { players: Player[]; kick: (id: string, name: string) => void }) {
  if (players.length === 0) return <div className="bg-white rounded p-2 text-xs text-gray-400 text-center">Chưa có SV</div>;
  return (
    <div className="bg-white rounded p-2">
      <div className="text-xs font-semibold text-gray-600 mb-1">👥 {players.length} SV:</div>
      <div className="space-y-1">
        {players.map(p => (
          <div key={p.id} className="flex items-center justify-between text-xs">
            <span>
              {p.isCaptain && '👑 '}
              {p.name}
            </span>
            <button onClick={() => kick(p.id, p.name)}
              className="text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded hover:bg-rose-50">
              Kick
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
