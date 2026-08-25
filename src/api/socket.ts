import io, { Socket } from 'socket.io-client';
import { getApiBaseUrl } from './config';
import { tokenStore } from './client';

let socket: Socket | null = null;
let currentUser: { id: number | string; role_id: number } | null = null;
/** Conversation rooms the client is currently joined to (re-joined on reconnect). */
const joinedRooms = new Set<string>();

const userRole = (): 'doctor' | 'patient' =>
  currentUser?.role_id === 3 ? 'doctor' : 'patient';

/**
 * App-wide "data changed" signal. The socket forwards relevant backend events
 * here so any list screen can auto-refresh without wiring its own socket
 * listeners (see the useAutoRefresh hook).
 */
type DataListener = () => void;
const dataListeners = new Set<DataListener>();

export const liveData = {
  subscribe(fn: DataListener): () => void {
    dataListeners.add(fn);
    return () => {
      dataListeners.delete(fn);
    };
  },
  emit(): void {
    dataListeners.forEach((fn) => fn());
  },
};

/**
 * Socket.IO singleton for the Fountain chat feature.
 * Rule: send = REST, receive = Socket.IO. The socket authenticates with the
 * JWT (auth + query) so the server knows who is listening and routes events.
 */
export const socketService = {
  /** Remember the logged-in user so events carry userId/userRole. */
  setUser(user: { id: number | string; role_id: number } | null): void {
    currentUser = user;
  },

  /** Connect to the socket server (safe to call multiple times). */
  async connect(): Promise<Socket | null> {
    if (socket?.connected) return socket;
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    const token = await tokenStore.get();
    socket = io(getApiBaseUrl(), {
      auth: token ? { token } : undefined,
      query: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // websocket first, polling fallback — survives proxy/ngrok upgrade failures
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[socket] ✅ Connected:', socket?.id);
      // Re-register on reconnect so presence stays accurate.
      if (currentUser) socketService.addUser();
      // Re-join any conversation rooms the user had open.
      joinedRooms.forEach((id) => socketService.joinSession(id));
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

    // Forward data-affecting events so list screens can auto-refresh live.
    const broadcast = () => liveData.emit();
    (
      [
        'chat-request',
        'chat-decision',
        'session-timer-update',
        'session-ended',
        'user-joined',
        'user-left',
      ] as const
    ).forEach((ev) => socket?.on(ev, broadcast));

    return socket;
  },

  disconnect(): void {
    joinedRooms.clear();
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

  joinSession(conversationId: number | string): void {
    joinedRooms.add(String(conversationId));
    socket?.emit('join-consultation', { consultationId: Number(conversationId) });
  },

  leaveSession(conversationId: number | string): void {
    joinedRooms.delete(String(conversationId));
    socket?.emit('leave-conversation', { conversationId });
  },

  /** Signal typing (boolean form). */
  sendTyping(conversationId: number | string): void {
    socket?.emit('typing', { conversationId, isTyping: true });
  },

  /** Explicitly clear the peer's typing indicator. */
  sendTypingStopped(conversationId: number | string): void {
    socket?.emit('typing', { conversationId, isTyping: false });
  },
};
