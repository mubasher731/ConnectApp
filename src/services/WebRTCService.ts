import {
  mediaDevices,
  RTCPeerConnection,
  RTCView,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  MediaStreamTrack,
  registerGlobals,
} from 'react-native-webrtc';

import { RTC_CONFIG, CALL_CONFIG } from '../config/webrtc';

registerGlobals();

type CallType = 'audio' | 'video';
type RTCPeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export interface WebRTCEvents {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onError: (error: Error) => void;
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onOfferCreated: (offer: RTCSessionDescriptionInit) => void;
  onAnswerCreated: (answer: RTCSessionDescriptionInit) => void;
}

interface CallParticipant {
  userId: number;
  name: string;
  avatar?: string;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private events: Partial<WebRTCEvents> = {
    onOfferCreated: undefined,
    onAnswerCreated: undefined,
  };
  private callType: CallType = 'video';
  private remoteUserId: number | null = null;
  private isInitiator = false;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  /** Current camera (toggled by switchCamera; getSettings() is unreliable). */
  private facingMode: 'user' | 'environment' = 'user';

  setEvents(events: Partial<WebRTCEvents>) {
    this.events = { ...this.events, ...events };
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getConnectionState() {
    return this.peerConnection?.connectionState || 'new';
  }

  async createPeerConnection(remoteUserId: number, isInitiator: boolean, callType: CallType) {
    // Never create a new peer connection while another is still live — doing so
    // (e.g. getUserMedia too fast, double-tap, or a stale connection) can crash
    // the native WebRTC library. Clean up any existing state first.
    if (this.peerConnection || this.localStream) {
      this.cleanup();
    }

    this.remoteUserId = remoteUserId;
    this.isInitiator = isInitiator;
    this.callType = callType;

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onIceCandidate?.(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.events.onRemoteStream?.(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || 'disconnected';
      this.events.onConnectionStateChange?.(state);

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        // Guard against re-entry: cleanup() closes the peer connection, which
        // fires 'closed' → this handler again. Once the PC is null, skip —
        // otherwise onCallEnded would fire twice (double RESET/stop/leave).
        if (this.peerConnection) {
          this.cleanup();
          this.events.onCallEnded?.();
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState || 'new';
      console.log('[WebRTC] ICE connection state:', state);
    };

    try {
      this.localStream = await this.getUserMedia(callType);
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
      // Notify the UI that local media is ready (updates the PiP preview).
      this.events.onLocalStream?.(this.localStream);
    } catch (error) {
      console.error('[WebRTC] Failed to get user media:', error);
      this.events.onError?.(error as Error);
      throw error;
    }

    if (this.isInitiator) {
      await this.createOffer();
    }

    this.processQueuedCandidates();
  }

  private async getUserMedia(callType: CallType): Promise<MediaStream> {
    const constraints =
      callType === 'audio' ? CALL_CONFIG.AUDIO_ONLY_CONSTRAINTS : CALL_CONFIG.VIDEO_CONSTRAINTS;

    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      // Remember which camera we got so switchCamera() can flip reliably
      // (getSettings().facingMode can be undefined on some devices, which made
      // the camera appear "stuck" on the front camera).
      if (callType === 'video') {
        const requested = (constraints.video as any)?.facingMode;
        this.facingMode = requested === 'environment' ? 'environment' : 'user';
      }
      console.log('[WebRTC] Got user media:', callType);
      return stream;
    } catch (error) {
      console.error('[WebRTC] getUserMedia error:', error);
      throw error;
    }
  }

  private async createOffer() {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video',
      });
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTC] Created offer');
      this.events.onOfferCreated?.(offer);
    } catch (error) {
      console.error('[WebRTC] Create offer error:', error);
      this.events.onError?.(error as Error);
    }
  }

  async createAnswer() {
    if (!this.peerConnection) return;

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[WebRTC] Created answer');
      this.events.onAnswerCreated?.(answer);
    } catch (error) {
      console.error('[WebRTC] Create answer error:', error);
      this.events.onError?.(error as Error);
    }
  }

  async setRemoteOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Set remote offer');
      // NOTE: the SDP answer is created later in acceptCall(), so the caller
      // hears/sees nothing until the callee actually accepts the call.
      // Remote description is ready — apply any queued ICE candidates.
      this.processQueuedCandidates();
    } catch (error) {
      console.error('[WebRTC] Set remote offer error:', error);
      this.events.onError?.(error as Error);
    }
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Set remote answer');
      // Remote description is ready — apply any queued ICE candidates.
      this.processQueuedCandidates();
    } catch (error) {
      console.error('[WebRTC] Set remote answer error:', error);
      this.events.onError?.(error as Error);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    // The remote description must exist before candidates can be added. If it
    // is not ready yet (e.g. candidates arrive before the offer/answer), queue
    // them and flush once the remote description is set.
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.iceCandidatesQueue.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] Added ICE candidate');
    } catch (error) {
      console.error('[WebRTC] Add ICE candidate error:', error);
    }
  }

  private processQueuedCandidates() {
    while (
      this.iceCandidatesQueue.length > 0 &&
      this.peerConnection &&
      this.peerConnection.remoteDescription
    ) {
      const candidate = this.iceCandidatesQueue.shift();
      if (candidate) {
        this.addIceCandidate(candidate);
      }
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }

  toggleVideo() {
    if (this.localStream && this.callType === 'video') {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }

  isAudioEnabled(): boolean {
    if (!this.localStream) return true;
    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.length > 0 ? audioTracks[0].enabled : true;
  }

  isVideoEnabled(): boolean {
    if (!this.localStream || this.callType === 'audio') return false;
    const videoTracks = this.localStream.getVideoTracks();
    return videoTracks.length > 0 ? videoTracks[0].enabled : false;
  }

  async switchCamera() {
    if (!this.localStream || this.callType === 'audio') return;
    const local = this.localStream;

    const videoTracks = local.getVideoTracks();
    if (videoTracks.length === 0) return;

    const currentTrack = videoTracks[0];
    const nextFacing = this.facingMode === 'user' ? 'environment' : 'user';

    try {
      // Release the current camera BEFORE requesting the next one. Requesting
      // getUserMedia while the old track still holds the camera can hang/freeze
      // the camera on Android (camera already in use), leaving it "stuck".
      local.removeTrack(currentTrack);
      currentTrack.stop();

      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newTrack = stream.getVideoTracks()[0];
      if (!newTrack) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.facingMode = nextFacing;

      // Build a BRAND-NEW MediaStream (same audio + new video). A new stream
      // has a new reactTag/URL, so the RTCView local preview re-renders with
      // the new camera — swapping tracks on the same stream keeps the same URL,
      // so the preview froze on the old camera.
      const newLocal = new MediaStream([...local.getAudioTracks(), newTrack]);

      // Swap the sender so the remote sees the new camera.
      const sender = this.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      this.localStream = newLocal;
      // Emit the NEW stream so the UI preview (localStream.toURL()) updates.
      this.events.onLocalStream?.(this.localStream);
    } catch (error) {
      console.error('[WebRTC] Switch camera error:', error);
      // Try to restore a camera so the call isn't left without video.
      try {
        const restore = await mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: this.facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        const restoreTrack = restore.getVideoTracks()[0];
        if (restoreTrack) {
          const restored = new MediaStream([
            ...(this.localStream?.getAudioTracks() ?? []),
            restoreTrack,
          ]);
          const sender = this.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(restoreTrack);
          this.localStream = restored;
          this.events.onLocalStream?.(this.localStream);
        }
      } catch (_) {
        // give up — no camera available
      }
    }
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.iceCandidatesQueue = [];
    this.remoteUserId = null;
    this.isInitiator = false;
    console.log('[WebRTC] Cleaned up');
  }

  async restartIce() {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.restartIce();
      console.log('[WebRTC] ICE restarted');
    } catch (error) {
      console.error('[WebRTC] ICE restart error:', error);
    }
  }
}

export const webRTCService = new WebRTCService();