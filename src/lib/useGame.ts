'use client';
import { useEffect, useState } from 'react';
import { getSocket } from './socket-client';
import type { GameState } from './types';

// Hook để subscribe vào state:update events từ socket.
// Tự động xin state khi mount + tick mỗi giây (để countdown UI update).
export function useGameState(): GameState | null {
  const [state, setState] = useState<GameState | null>(null);
  const [, setNow] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    const handler = (s: GameState) => setState(s);
    socket.on('state:update', handler);

    const requestState = () => socket.emit('client:requestState');
    requestState();
    socket.on('connect', requestState);

    // Tick 1Hz để force re-render countdown
    const tickId = setInterval(() => setNow(x => x + 1), 1000);

    return () => {
      socket.off('state:update', handler);
      socket.off('connect', requestState);
      clearInterval(tickId);
    };
  }, []);

  return state;
}
