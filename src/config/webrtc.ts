/**
 * WebRTC Configuration for ConnectWell App
 * STUN/TURN servers for NAT traversal
 */

export const RTC_CONFIG = {
  iceServers: [
    // ── Local Development (Free) ──────────────────────────────────────────
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },

    // ── Production (Uncomment for VPS coturn) ─────────────────────────────
    // {
    //   urls: 'turn:your-vps-ip:3478',
    //   username: 'fountain',
    //   credential: 'your-secure-password',
    // },
    // {
    //   urls: 'turn:your-vps-ip:3478?transport=tcp',
    //   username: 'fountain',
    //   credential: 'your-secure-password',
    // },
  ],
  iceCandidatePoolSize: 10,
};

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