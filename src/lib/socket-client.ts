'use client';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let clockOffsetMs = 0;

export function getSocket(): Socket {
  if (!socket) {
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin)
      : '';
    socket = io(url, { transports: ['websocket', 'polling'] });
    socket.on('state:tick', ({ at }: { at: number }) => { clockOffsetMs = at - Date.now(); });
  }
  return socket;
}

// Giờ của server: hạn chốt do server tính, còn đồng hồ điện thoại có thể lệch
export function serverNow(): number {
  return Date.now() + clockOffsetMs;
}

// Mã riêng của trình duyệt: giúp server nhận ra SV vào lại sau khi rớt mạng
export function getClientToken(): string {
  const key = 'bg_client_token';
  let token = localStorage.getItem(key);
  if (!token) {
    token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, token);
  }
  return token;
}
