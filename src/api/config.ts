/**
 * API configuration.
 *
 * The backend exposes its public URL via GET /api/config (so ngrok/dynamic
 * hosts are supported). We start with a fallback and update at runtime.
 */
export const FALLBACK_BASE_URL = 'https://nonrefractional-superradically-emiko.ngrok-free.dev';

let currentBase = FALLBACK_BASE_URL;

/** Current API base URL (host only — REST uses /api/..., socket uses /socket.io/). */
export function getApiBaseUrl(): string {
  return currentBase;
}
