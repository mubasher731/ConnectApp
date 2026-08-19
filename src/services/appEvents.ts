/** Minimal typed event emitter used to decouple mock services from UI. */

import { AppNotification } from '../types';

export interface AppEventMap {
  notification: AppNotification;
  /** Fired when mock session data changes (status, messages, extension). */
  sessionChanged: { sessionId: string };
}

type Handler<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void;

const listeners = new Map<keyof AppEventMap, Set<Handler<any>>>();

export const appEvents = {
  on<K extends keyof AppEventMap>(event: K, handler: Handler<K>): () => void {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(handler as Handler<any>);
    return () => {
      listeners.get(event)?.delete(handler as Handler<any>);
    };
  },

  off<K extends keyof AppEventMap>(event: K, handler: Handler<K>): void {
    listeners.get(event)?.delete(handler as Handler<any>);
  },

  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
    listeners.get(event)?.forEach((h) => h(payload));
  },
};
