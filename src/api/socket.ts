import io, { Socket } from 'socket.io-client';
import { getApiBaseUrl } from './config';
import { tokenStore } from './client';

let socket: Socket | null = null;
let currentUser: { id: number | string; role_id: number } | null = null;
/** Conversation rooms the client is currently joined to (re-joined on reconnect). */
const joinedRooms = new Set<string>();
/** Guards against concurrent connect() calls creating duplicate sockets. */
let connectPromise: Promise<Socket | null> | null = null;

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
    // If a connect() is already in-flight, return the same promise so two
    // concurrent callers (AuthContext + CallContext) share one socket instead
    // of racing to create two.
    if (connectPromise) return connectPromise;

    // Reuse any socket that is connected or still (re)connecting.
    if (socket) {
      if (socket.connected || socket.active) {
        connectPromise = null;
        return socket;
      }
      socket.disconnect();
      socket = null;
    }

    connectPromise = (async () => {
      const token = await tokenStore.get();
      socket = io(getApiBaseUrl(), {
        auth: token ? { token } : undefined,
        query: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        // Re-register on reconnect so presence stays accurate.
        if (currentUser) socketService.addUser();
        joinedRooms.forEach((id) => socketService.joinSession(id));
      });
      socket.on('disconnect', () => {});
      socket.on('connect_error', () => {});
      socket.on('error', () => {});

      // Forward data-affecting events so list screens can auto-refresh live.
      const broadcast = () => liveData.emit();
      (
        [
          'chat-request',
          'chat-decision',
          'schedule-shifted',
          'session-timer-update',
          'session-ended',
          'new-message',
          'user-joined',
          'user-left',
        ] as const
      ).forEach((ev) => socket?.on(ev, broadcast));

      // Wait for the socket to actually connect before returning, so callers
      // get a connected socket (or null on failure) instead of a half-open one.
      return new Promise<Socket | null>((resolve) => {
        if (!socket) { connectPromise = null; resolve(null); return; }
        const onConnect = () => { cleanup(); connectPromise = null; resolve(socket); };
        const onError = (err: Error) => { cleanup(); connectPromise = null; socket?.disconnect(); socket = null; resolve(null); };
        const cleanup = () => { socket?.off('connect', onConnect); socket?.off('connect_error', onError); };
        socket.on('connect', onConnect);
        socket.on('connect_error', onError);
        // If already connected (race), resolve immediately
        if (socket.connected) { cleanup(); connectPromise = null; resolve(socket); }
      });
    })();

    return connectPromise;
  },

  disconnect(): void {
    joinedRooms.clear();
    connectPromise = null;
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
    socket?.emit('join-conversation', { conversationId });
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
