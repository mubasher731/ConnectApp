import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../api/config';
import { tokenStore } from '../api/client';
import { webRTCService, WebRTCEvents } from '../services/WebRTCService';
import { MediaStream } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

type RTCPeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active' | 'reconnecting';

interface CallState {
  status: CallStatus;
  callType: 'audio' | 'video';
  remoteUser: {
    userId: number;
    name: string;
    avatar?: string;
  } | null;
  sessionId: number | null;
  duration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  connectionState: RTCPeerConnectionState;
}

type CallAction =
  | { type: 'SET_STATUS'; status: CallStatus }
  | { type: 'SET_CALL_TYPE'; callType: 'audio' | 'video' }
  | { type: 'SET_REMOTE_USER'; user: CallState['remoteUser'] }
  | { type: 'SET_SESSION_ID'; sessionId: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'INCREMENT_DURATION' }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_VIDEO_ENABLED'; enabled: boolean }
  | { type: 'SET_SPEAKER'; speaker: boolean }
  | { type: 'SET_CONNECTION_STATE'; state: RTCPeerConnectionState }
  | { type: 'RESET' };

const initialState: CallState = {
  status: 'idle',
  callType: 'video',
  remoteUser: null,
  sessionId: null,
  duration: 0,
  isMuted: false,
  isVideoEnabled: true,
  isSpeakerOn: true,
  connectionState: 'new',
};

function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_CALL_TYPE':
      return { ...state, callType: action.callType };
    case 'SET_REMOTE_USER':
      return { ...state, remoteUser: action.user };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.sessionId };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'INCREMENT_DURATION':
      return { ...state, duration: state.duration + 1 };
    case 'SET_MUTED':
      return { ...state, isMuted: action.muted };
    case 'SET_VIDEO_ENABLED':
      return { ...state, isVideoEnabled: action.enabled };
    case 'SET_SPEAKER':
      return { ...state, isSpeakerOn: action.speaker };
    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.state };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

interface CallContextType {
  state: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initiateCall: (userId: number, name: string, callType: 'audio' | 'video', sessionId: number) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;
  onIncomingCall: (data: {
    from: number;
    fromName: string;
    offer: any;
    sessionId: number;
    callType: string;
  }) => void;
  onCallAnswer: (answer: any) => void;
  onIceCandidate: (candidate: any) => void;
  onCallEnded: () => void;
  onCallRejected: () => void;
  onCallBusy: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: ReactNode;
}

let socket: Socket | null = null;
let durationInterval: ReturnType<typeof setInterval> | null = null;
let ringTimeout: ReturnType<typeof setTimeout> | null = null;

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // InCallManager is initialized on call start (acceptCall), not on mount,
  // to avoid activating the proximity sensor when no call is active.

  // Initialize socket connection
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await tokenStore.get();
      if (cancelled || !token) return;

      socket = io(getApiBaseUrl(), {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('[Call] Socket connected');
      });

      socket.on('disconnect', (reason) => {
        console.log('[Call] Socket disconnected:', reason);
        if (state.status === 'active' || state.status === 'outgoing') {
          dispatch({ type: 'SET_STATUS', status: 'reconnecting' });
        }
      });

      socket.on('call:incoming', handleIncomingCall);
      socket.on('call:answer', handleCallAnswer);
      socket.on('call:ice-candidate', handleIceCandidate);
      socket.on('call:ended', handleCallEnded);
      socket.on('call:rejected', handleCallRejected);
      socket.on('call:busy', handleCallBusy);
    })();

    return () => {
      cancelled = true;
      socket?.off('call:incoming', handleIncomingCall);
      socket?.off('call:answer', handleCallAnswer);
      socket?.off('call:ice-candidate', handleIceCandidate);
      socket?.off('call:ended', handleCallEnded);
      socket?.off('call:rejected', handleCallRejected);
      socket?.off('call:busy', handleCallBusy);
      socket?.disconnect();
      socket = null;
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (state.status === 'active') {
      durationInterval = setInterval(() => {
        dispatch({ type: 'INCREMENT_DURATION' });
      }, 1000);
    } else {
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
    };
  }, [state.status]);

  // WebRTC event handlers
  useEffect(() => {
    const events: WebRTCEvents = {
      onRemoteStream: () => {
        // Stream is handled by WebRTCService directly
      },
      onCallEnded: () => {
        handleCallEnded();
      },
      onError: (error) => {
        console.error('[CallContext] WebRTC error:', error);
        handleCallEnded();
      },
      onIceCandidate: (candidate) => {
        if (state.remoteUser?.userId && socket) {
          socket.emit('call:ice-candidate', {
            to: state.remoteUser.userId,
            candidate,
          });
        }
      },
      onConnectionStateChange: (connectionState) => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: connectionState });
      },
      onOfferCreated: (offer) => {
        if (state.remoteUser?.userId && socket) {
          socket.emit('call:offer', {
            to: state.remoteUser.userId,
            offer,
            sessionId: state.sessionId,
            callType: state.callType,
          });
        }
      },
      onAnswerCreated: (answer) => {
        if (state.remoteUser?.userId && socket) {
          socket.emit('call:answer', {
            to: state.remoteUser.userId,
            answer,
          });
        }
      },
    };

    webRTCService.setEvents(events);

    return () => {
      webRTCService.setEvents({});
    };
  }, [state.remoteUser?.userId, state.sessionId, state.callType, socket]);

  // Handle incoming call
  const handleIncomingCall = useCallback(
    (data: { from: number; fromName: string; offer: any; sessionId: number; callType: string }) => {
      if (state.status !== 'idle') {
        socket?.emit('call:busy', { to: data.from });
        return;
      }

      dispatch({ type: 'SET_REMOTE_USER', user: { userId: data.from, name: data.fromName, avatar: undefined } });
      dispatch({ type: 'SET_CALL_TYPE', callType: data.callType as 'audio' | 'video' });
      dispatch({ type: 'SET_SESSION_ID', sessionId: data.sessionId });
      dispatch({ type: 'SET_STATUS', status: 'incoming' });

      // Auto-reject after 30 seconds
      ringTimeout = setTimeout(() => {
        if (isMounted.current) rejectCall();
      }, 30000);

      // Set up WebRTC with the offer
      webRTCService.createPeerConnection(data.from, false, data.callType as 'audio' | 'video');
      webRTCService.setRemoteOffer(data.offer);
    },
    [state.status]
  );

  const handleCallAnswer = useCallback(
    (data: { from: number; answer: any }) => {
      if (state.status === 'outgoing' && state.remoteUser?.userId === data.from) {
        webRTCService.setRemoteAnswer(data.answer);
        if (isMounted.current) {
          dispatch({ type: 'SET_STATUS', status: 'active' });
          dispatch({ type: 'SET_DURATION', duration: 0 });
          // Start InCallManager for the caller side too
          InCallManager.start({ media: state.callType === 'video' ? 'video' : 'audio' });
          InCallManager.setSpeakerphoneOn(true);
        }
      }
    },
    [state.status, state.remoteUser?.userId, state.callType]
  );

  const handleIceCandidate = useCallback(
    (data: { from: number; candidate: any }) => {
      if (state.remoteUser?.userId === data.from) {
        webRTCService.addIceCandidate(data.candidate);
      }
    },
    [state.remoteUser?.userId]
  );

  const handleCallEnded = useCallback(() => {
    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }
    webRTCService.cleanup();
    InCallManager.stop();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
    }
  }, []);

  const handleCallRejected = useCallback(() => {
    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }
    webRTCService.cleanup();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
    }
  }, []);

  const handleCallBusy = useCallback(() => {
    webRTCService.cleanup();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
    }
  }, []);

  // Actions
  const initiateCall = useCallback(
    (userId: number, name: string, callType: 'audio' | 'video', sessionId: number) => {
      if (state.status !== 'idle') return;

      dispatch({ type: 'SET_REMOTE_USER', user: { userId, name, avatar: undefined } });
      dispatch({ type: 'SET_CALL_TYPE', callType });
      dispatch({ type: 'SET_SESSION_ID', sessionId });
      dispatch({ type: 'SET_STATUS', status: 'outgoing' });

      webRTCService.createPeerConnection(userId, true, callType);
      // Offer will be sent via onOfferCreated event
    },
    [state.status]
  );

  const acceptCall = useCallback(() => {
    if (state.status !== 'incoming') return;

    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }

    dispatch({ type: 'SET_STATUS', status: 'active' });
    dispatch({ type: 'SET_DURATION', duration: 0 });

    // Start InCallManager
    InCallManager.start({ media: state.callType === 'video' ? 'video' : 'audio' });
    InCallManager.setSpeakerphoneOn(true);

    // The answer was already created in handleIncomingCall via setRemoteOffer -> createAnswer
    // It will be sent via onAnswerCreated event
  }, [state.status, state.callType]);

  const rejectCall = useCallback(() => {
    if (state.status !== 'incoming' && state.status !== 'outgoing') return;

    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }

    if (state.remoteUser?.userId && socket) {
      socket.emit('call:reject', { to: state.remoteUser.userId });
    }

    webRTCService.cleanup();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
    }
  }, [state.status, state.remoteUser?.userId]);

  const endCall = useCallback(() => {
    if (state.status !== 'active' && state.status !== 'outgoing') return;

    if (state.remoteUser?.userId && socket) {
      socket.emit('call:end', { to: state.remoteUser.userId });
    }

    webRTCService.cleanup();
    InCallManager.stop();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
    }
  }, [state.status, state.remoteUser?.userId]);

  const toggleMute = useCallback(() => {
    const newMuted = !state.isMuted;
    webRTCService.toggleAudio();
    dispatch({ type: 'SET_MUTED', muted: newMuted });
    InCallManager.setMicrophoneMute(newMuted);
  }, [state.isMuted]);

  const toggleVideo = useCallback(() => {
    if (state.callType === 'audio') return;
    const newEnabled = !state.isVideoEnabled;
    webRTCService.toggleVideo();
    dispatch({ type: 'SET_VIDEO_ENABLED', enabled: newEnabled });
  }, [state.isVideoEnabled, state.callType]);

  const toggleSpeaker = useCallback(() => {
    const newSpeaker = !state.isSpeakerOn;
    InCallManager.setSpeakerphoneOn(newSpeaker);
    dispatch({ type: 'SET_SPEAKER', speaker: newSpeaker });
  }, [state.isSpeakerOn]);

  const switchCamera = useCallback(() => {
    webRTCService.switchCamera();
  }, []);

  const value: CallContextType = {
    state,
    localStream: webRTCService.getLocalStream(),
    remoteStream: webRTCService.getRemoteStream(),
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    onIncomingCall: handleIncomingCall,
    onCallAnswer: handleCallAnswer,
    onIceCandidate: handleIceCandidate,
    onCallEnded: handleCallEnded,
    onCallRejected: handleCallRejected,
    onCallBusy: handleCallBusy,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};