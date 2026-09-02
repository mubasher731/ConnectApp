/**
 * WebRTC Configuration for ConnectWell App
 *
 * STUN/TURN servers for NAT traversal.
 *
 * IMPORTANT: This file deliberately ships with no hardcoded TURN credentials.
 * Production TURN configuration is fetched at call setup time from the
 * backend's authenticated `POST /api/calls/ice-credentials` endpoint. The
 * fallback below is only used when the backend explicitly signals that
 * TURN is unavailable (e.g. local development without a coturn server).
 * Never embed real production TURN usernames or passwords here.
 */

export const FALLBACK_ICE_CONFIG = {
  iceServers: [],
};

export const RTC_CONFIG = FALLBACK_ICE_CONFIG;


export const CALL_CONFIG = {
  RING_TIMEOUT_MS: 30000,
  DEFAULT_VIDEO_CONSTRAINTS: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 },
  },
  AUDIO_ONLY_CONSTRAINTS: {
    audio: true,
    video: false,
  },
  VIDEO_CONSTRAINTS: {
    audio: true,
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 24 },
      facingMode: 'user',
    },
  },
};