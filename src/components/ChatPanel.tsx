'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChainKey, RoleKey } from '@/lib/types';
import { getSocket } from '@/lib/socket-client';

export function ChatPanel({
  messages, chain, role, currentPlayerId,
}: {
  messages: ChatMessage[];
  chain: ChainKey;
  role: RoleKey;
  currentPlayerId: string;
}) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const groupMsgs = messages.filter(m => m.chain === chain && m.role === role);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMsgs.length]);

  function send() {
    const t = text.trim();
    if (!t) return;
    getSocket().emit('player:chat', { text: t });
    setText('');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm flex flex-col h-[500px] border border-slate-200">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
        <div className="font-bold text-sm flex items-center gap-2">
          💬 Chat nhóm
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Chỉ các thành viên cùng vai thấy</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-sm">
        {groupMsgs.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            <div className="text-3xl mb-2">💭</div>
            <div className="text-sm">Chưa có tin nhắn</div>
            <div className="text-xs text-gray-400 mt-1">Hãy thảo luận chiến lược đặt đơn!</div>
          </div>
        )}
        {groupMsgs.map(m => {
          const mine = m.playerId === currentPlayerId;
          return (
            <div key={m.id} className={mine ? 'text-right' : ''}>
              <div className="text-xs text-gray-500 mb-0.5">{m.playerName}</div>
              <div className={`inline-block rounded-2xl px-3 py-1.5 max-w-[85%] text-left ${
                mine ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex gap-1 p-2 border-t bg-slate-50 rounded-b-xl">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Gõ tin nhắn..."
          className="flex-1 border border-gray-300 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        <button onClick={send}
          className="bg-blue-600 text-white px-4 rounded-full text-sm font-semibold hover:bg-blue-700 transition-smooth">
          Gửi
        </button>
      </div>
    </div>
  );
}
