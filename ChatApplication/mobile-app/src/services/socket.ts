import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/useAppStore';

let socket: Socket | null = null;
const SOCKET_URL = 'http://10.0.2.2:4000';

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
