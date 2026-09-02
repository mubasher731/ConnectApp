import { api } from '../api/client';

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
  const { data } = await api.post('/calls/ice-credentials', { consultationId });
  const payload = data?.data ?? data ?? {};
  return {
    iceServers: Array.isArray(payload.iceServers) ? payload.iceServers : [],
    relayAvailable: Boolean(payload.relayAvailable ?? false),
    mode: payload.mode ?? 'unknown',
    expiresAt: payload.expiresAt ?? null,
  };
};

export default { getIceConfig };
