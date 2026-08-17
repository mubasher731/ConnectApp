/**
 * API configuration.
 *
 * The backend exposes its public URL via GET /api/config (so ngrok/dynamic
 * hosts are supported). We start with a fallback and update at runtime.
 *
 * Working backend (dev):
 *   - Local LAN: http://172.29.30.38:5002  (same Wi-Fi as this Mac)
 *   - Public/ngrok: https://nonrefractional-superradically-emiko.ngrok-free.dev
 *   The backend's /api/config reports the ngrok publicUrl, so at runtime the
 *   app typically talks to ngrok (which tunnels to the same server).
 */
export const FALLBACK_BASE_URL = 'http://172.29.30.38:5002';

let currentBase = FALLBACK_BASE_URL;

/** Current API base URL (host only — REST uses /api/..., socket uses /socket.io/). */
export function getApiBaseUrl(): string {
  return currentBase;
}
