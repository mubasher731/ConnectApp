import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FALLBACK_BASE_URL, getApiBaseUrl } from './config';
import { User } from '../types';

const SESSION_KEY = '@connectapp/session';

let cachedSession: { token: string; user: User } | null = null;

/** Session store: JWT + the logged-in user (AsyncStorage persisted). */
export const tokenStore = {
  async getSession(): Promise<{ token: string; user: User } | null> {
    if (cachedSession) return cachedSession;
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      cachedSession = JSON.parse(raw) as { token: string; user: User };
    } catch {
      cachedSession = null;
    }
    return cachedSession;
  },

  async setSession(session: { token: string; user: User } | null): Promise<void> {
    cachedSession = session;
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  },

  async get(): Promise<string | null> {
    return (await tokenStore.getSession())?.token ?? null;
  },

  async getUser(): Promise<User | null> {
    return (await tokenStore.getSession())?.user ?? null;
  },
};

export const api = axios.create({ baseURL: getApiBaseUrl(), timeout: 20000 });

/**
 * Discover the public URL from the backend (GET /api/config) and point both
 * HTTP and Socket.IO at it. Falls back to FALLBACK_BASE_URL if unreachable.
 */
export async function loadApiConfig(): Promise<void> {
  try {
    const res = await fetch(`${FALLBACK_BASE_URL}/api/config`);
    const json = await res.json();
    const url = (json?.publicUrl || FALLBACK_BASE_URL).replace(/\/+$/, '');
    api.defaults.baseURL = url;
    console.log('[config] publicUrl =', url);
  } catch {
    // Keep the fallback URL.
  }
}

// Attach the JWT to every protected request.
api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 the session is invalid (token rotation) — clear it locally.
// (No refresh-token endpoint exists in the current API.)
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await tokenStore.setSession(null);
    }
    return Promise.reject(extractError(error));
  }
);

/** Normalize API errors — new format uses top-level `message` (old used `error`). */
export function extractError(error: unknown): Error {
  const anyError = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return new Error(
    anyError?.response?.data?.message ??
      anyError?.response?.data?.error ??
      anyError?.message ??
      'Something went wrong. Please try again.'
  );
}
