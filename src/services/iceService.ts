import { api } from '../api/client';
import { getApiBaseUrl } from '../api/config';

export type IceConfig = {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  relayAvailable: boolean;
  mode: 'local' | 'production' | 'unknown';
  expiresAt: string | null;
};

export const getIceConfig = async (consultationId: number | string): Promise<IceConfig> => {
  try {
    const { data } = await api.post('/api/calls/ice-credentials', { consultationId });
    const payload = data?.data ?? data ?? {};
    const iceServers = Array.isArray(payload.iceServers) ? payload.iceServers : [];
    // Loud success log so we can verify the mobile really reaches THIS backend
    // and that it actually returns relay servers (not an empty local config).
    console.log(
      '[ICE] GET /api/calls/ice-credentials OK ->',
      JSON.stringify({
        host: getApiBaseUrl(),
        consultationId,
        serverCount: iceServers.length,
        relay: Boolean(payload.relayAvailable ?? false),
        mode: payload.mode ?? 'unknown',
      })
    );
    return {
      iceServers,
      relayAvailable: Boolean(payload.relayAvailable ?? false),
      mode: payload.mode ?? 'unknown',
      expiresAt: payload.expiresAt ?? null,
    };
  } catch (error: any) {
    const status =
      (error as { status?: number } | null)?.status ??
      (error as { response?: { status?: number } })?.response?.status;
    console.warn(
      '[ICE] GET /api/calls/ice-credentials FAILED ->',
      JSON.stringify({
        host: getApiBaseUrl(),
        consultationId,
        status: status ?? 'none',
        message: (error as Error)?.message ?? error,
      })
    );
    throw error;
  }
};

export default { getIceConfig };
