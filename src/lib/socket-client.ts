'use client';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin)
      : '';
    socket = io(url, { transports: ['websocket', 'polling'] });
  }
  return socket;
}
