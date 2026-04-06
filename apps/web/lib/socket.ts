import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@hollywood/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(token?: string): TypedSocket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:3001';
    socket = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });
  }
  return socket;
}

/** Reconnect with a fresh token (e.g. after login or token refresh). */
export function reconnectWithToken(token: string): TypedSocket {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket(token);
}
