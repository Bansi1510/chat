import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/useAppStore';
import { SOCKET_URL } from '../config';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAppStore.getState().accessToken;
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  const token = useAppStore.getState().accessToken;
  if (token) {
    s.auth = { token };
    s.connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
