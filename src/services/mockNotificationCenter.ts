/**
 * In-app notification center backed by AsyncStorage.
 * The MockSessionProvider triggers these from timers (5-min pre-session
 * reminder); they persist so the Notifications tab shows the history too.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification, NotificationKind } from '../types';
import { appEvents } from './appEvents';

const KEY = '@connectapp/mock_notifications';

let cache: AppNotification[] | null = null;

const load = async (): Promise<AppNotification[]> => {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    cache = [];
    return cache;
  }
  try {
    cache = JSON.parse(raw) as AppNotification[];
  } catch {
    cache = [];
  }
  return cache;
};

const save = async (list: AppNotification[]): Promise<void> => {
  cache = list;
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
};

export const mockNotificationCenter = {
  async add(
    kind: NotificationKind,
    title: string,
    body: string,
    target?: { userId?: number; role?: 'patient' | 'doctor' },
    createdAt = new Date().toISOString()
  ): Promise<AppNotification> {
    const list = await load();
    const notification: AppNotification = {
      id: `N-${Date.now()}-${list.length}`,
      kind,
      title,
      body,
      createdAt,
      read: false,
      userId: target?.userId,
      userRole: target?.role,
    };
    list.unshift(notification);
    await save(list);
    appEvents.emit('notification', notification);
    return notification;
  },

  async list(): Promise<AppNotification[]> {
    return load();
  },

  /** Notifications relevant to a user (targeted to them, or general). */
  async listForUser(userId?: number): Promise<AppNotification[]> {
    const all = await load();
    if (!userId) return all;
    return all.filter((n) => n.userId === undefined || n.userId === userId);
  },

  async markAllRead(): Promise<void> {
    const list = await load();
    list.forEach((n) => {
      n.read = true;
    });
    await save(list);
  },

  async clear(): Promise<void> {
    cache = null;
    await AsyncStorage.removeItem(KEY);
  },
};
