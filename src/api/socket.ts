import io, { Socket } from 'socket.io-client';
import { getApiBaseUrl } from './config';

let socket: Socket | null = null;
let currentUser: { id: number | string; role_id: number } | null = null;

const userRole = (): 'doctor' | 'patient' =>
  currentUser?.role_id === 3 ? 'doctor' : 'patient';

/**
 * Socket.IO singleton for the Fountain session feature.
 * Rule: send = REST, receive = Socket.IO. The socket itself is unauthenticated;
 * registration happens via `addUser` after login.
 */
export const socketService = {
  /** Remember the logged-in user so events carry userId/userRole. */
  setUser(user: { id: number | string; role_id: number } | null): void {
    currentUser = user;
  },

  /** Connect to the socket server (safe to call multiple times). */
  connect(): Socket | null {
    if (socket?.connected) return socket;
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(getApiBaseUrl(), {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[socket] ✅ Connected:', socket?.id);
      // Re-register on reconnect so presence stays accurate.
      if (currentUser) socketService.addUser();
    });
    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[socket] ❌ Connection failed:', err.message);
    });
    socket.on('error', (err) => {
      console.error('[socket] ❌ Socket error:', err.message);
    });

    return socket;
  },

  disconnect(): void {
    socket?.disconnect();
    socket = null;
  },

  getSocket(): Socket | null {
    return socket;
  },

  // --- Client → Server events ---
  /** Register this socket to the user (object form: { userId, userRole }). */
  addUser(): void {
    if (!currentUser) return;
    socket?.emit('addUser', { userId: currentUser.id, userRole: userRole() });
  },

  joinSession(sessionId: number | string): void {
    if (!currentUser) return;
    socket?.emit('joinSession', {
      sessionId,
      userId: currentUser.id,
      userRole: userRole(),
    });
  },

  leaveSession(sessionId: number | string): void {
    socket?.emit('leaveSession', { sessionId });
  },

  /** Signal typing (throttle ~1/s while typing). */
  sendTyping(sessionId: number | string): void {
    if (!currentUser) return;
    socket?.emit('typing', {
      sessionId,
      userId: currentUser.id,
      userRole: userRole(),
    });
  },

  /** Explicitly clear the peer's typing indicator. */
  sendTypingStopped(sessionId: number | string): void {
    if (!currentUser) return;
    socket?.emit('typingStopped', {
      sessionId,
      userId: currentUser.id,
      userRole: userRole(),
    });
  },
};
