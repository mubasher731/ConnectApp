/**
 * WebRTC Configuration for ConnectWell App
 * STUN/TURN servers for NAT traversal
 */

export const RTC_CONFIG = {
  iceServers: [
    // ── TURN relay over TCP:443 (firewall-friendly, like ngrok) ───────────
    // Required for media to flow between the two different mobile networks.
    // UDP STUN to Google (port 19302) is often blocked on mobile data and has
    // triggered a native libjingle SIGABRT on the network thread during ICE
    // gathering, so we avoid the UDP-STUN path entirely.
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
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