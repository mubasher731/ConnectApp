import { api, tokenStore } from '../api/client';
import { socketService } from '../api/socket';
import { User } from '../types';

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

/** Tolerates both response envelopes: `{ message, token, user }` (current) and `{ success, data: { user, token } }`. */
const extractAuth = (res: unknown): { user: User; token: string } => {
  const body = (res as any)?.data?.data ?? (res as any)?.data ?? res;
  const user = body.user ?? body.data?.user;
  const token = body.token ?? body.data?.token;
  return { user, token };
};

const registerSocket = (user: User): void => {
  socketService.setUser(user);
  socketService.addUser();
};

/** Authentication client wired to the Fountain Backend REST API. */
export const authService = {
  async signIn({ email, password }: SignInParams): Promise<AuthSession> {
    const res = await api.post('/api/auth/login', { email, password });
    const { user, token } = extractAuth(res);
    await tokenStore.setSession({ token, user });
    registerSocket(user);
    return { token, user };
  },

  /** Register a patient; optionally set the display name via /auth/profile. */
  async signUp({ name, email, password }: SignUpParams): Promise<AuthSession> {
    const res = await api.post('/api/auth/signup', { email, password, role: 'patient' });
    const { user, token } = extractAuth(res);
    await tokenStore.setSession({ token, user });
    registerSocket(user);

    if (name) {
      try {
        const { data } = await api.put('/api/auth/profile', { name });
        const updated = (data.data?.user ?? data.data ?? data) as User;
        if (updated?.id) {
          const session = await tokenStore.getSession();
          if (session) await tokenStore.setSession({ ...session, user: updated });
          socketService.setUser(updated);
          return { token, user: updated };
        }
      } catch {
        // Name is optional — keep the registered user if profile update fails.
      }
    }
    return { token, user };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Always clear local state even if the server call fails.
    }
    await tokenStore.setSession(null);
    socketService.disconnect();
  },

  /** Restore a saved session on cold start. */
  async restoreSession(): Promise<AuthSession | null> {
    const session = await tokenStore.getSession();
    if (!session?.token) return null;
    registerSocket(session.user);
    return session;
  },

  /** Current user from GET /auth/me (falls back to cached user). */
  async getMe(): Promise<User> {
    const cached = await tokenStore.getUser();
    try {
      const { data } = await api.get('/api/auth/me');
      const fresh = (data.data ?? data) as User;
      if (fresh?.id) {
        const session = await tokenStore.getSession();
        if (session) await tokenStore.setSession({ ...session, user: fresh });
        return fresh;
      }
    } catch {
      // Fall back to cached user below.
    }
    if (cached?.id) return cached;
    throw new Error('No active session.');
  },

  /** Update profile via PUT /auth/profile. */
  async updateProfile(patch: { name?: string; email?: string }): Promise<User> {
    const { data } = await api.put('/api/auth/profile', patch);
    const user = (data.data?.user ?? data.data ?? data) as User;
    const session = await tokenStore.getSession();
    if (session) await tokenStore.setSession({ ...session, user });
    socketService.setUser(user);
    return user;
  },

  /** Request a password reset email. */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/api/auth/forgot-password', { email });
  },
};
