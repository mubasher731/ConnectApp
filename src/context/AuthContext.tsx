import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService, SignInParams, SignUpParams } from '../services/authService';
import { loadApiConfig } from '../api/client';
import { socketService } from '../api/socket';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  isAuthenticated: boolean;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signInAsDoctor: (params: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: { name?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Discover the public URL first, then restore any saved session.
        await loadApiConfig();
        const session = await authService.restoreSession();
        if (mounted) setUser(session?.user ?? null);
      } finally {
        if (mounted) setInitializing(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Open a real-time socket while authenticated, registered to this user.
  // Keyed on user id only: reconnect on login/logout, not on profile edits.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    socketService.setUser(user);
    socketService.connect().then((s) => {
      if (!cancelled && s) socketService.addUser();
    });
    return () => {
      cancelled = true;
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const signIn = useCallback(async (params: SignInParams) => {
    const session = await authService.signIn(params);
    setUser(session.user);
  }, []);

  const signUp = useCallback(async (params: SignUpParams) => {
    const session = await authService.signUp(params);
    setUser(session.user);
  }, []);

  // Doctor login uses the same auth endpoint (role detected by the backend).
  const signInAsDoctor = useCallback(async (params: { email: string; password: string }) => {
    const session = await authService.signIn(params);
    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch: { name?: string; email?: string }) => {
    const next = await authService.updateProfile(patch);
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: user !== null,
      signIn,
      signUp,
      signInAsDoctor,
      signOut,
      updateUser,
    }),
    [user, initializing, signIn, signUp, signInAsDoctor, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
