/**
 * API configuration.
 *
 * The app talks to the Fountain Backend over REST + Socket.IO.
 * A runtime discovery call to GET /api/config can override the base URL;
 * otherwise we use the live public URL below (ngrok tunnel → localhost:5001).
 */
export const FALLBACK_BASE_URL = 'https://nonrefractional-superradically-emiko.ngrok-free.dev';

let currentBase = FALLBACK_BASE_URL;

/** Current API base URL (host only — REST uses /api/..., socket uses /socket.io/). */
export function getApiBaseUrl(): string {
  return currentBase;
}
