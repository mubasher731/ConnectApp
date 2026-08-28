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
        this.cleanup();
        this.events.onCallEnded?.();
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
      await this.createAnswer();
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
    } catch (error) {
      console.error('[WebRTC] Set remote answer error:', error);
      this.events.onError?.(error as Error);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
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
    while (this.iceCandidatesQueue.length > 0 && this.peerConnection) {
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

  switchCamera() {
    if (!this.localStream || this.callType === 'audio') return;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const currentTrack = videoTracks[0];
    const facingMode = currentTrack.getSettings().facingMode === 'user' ? 'environment' : 'user';

    mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      })
      .then((stream) => {
        const newTrack = stream.getVideoTracks()[0];
        const sender = this.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && newTrack) {
          sender.replaceTrack(newTrack);
        }
        currentTrack.stop();
        this.localStream?.removeTrack(currentTrack);
        this.localStream?.addTrack(newTrack);
      })
      .catch((error) => {
        console.error('[WebRTC] Switch camera error:', error);
      });
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