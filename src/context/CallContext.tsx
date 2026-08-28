import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, ReactNode, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../api/socket';
import { navigationRef, navigate, goBack } from '../navigation/navigationRef';
import { useAuth } from './AuthContext';
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

/** Navigate to the in-call screen (global, from anywhere in the app). */
const goToCallScreen = (): void => navigate('Call');

/** Leave the in-call screen only when it is the current route. */
const leaveCallScreen = (): void => {
  if (navigationRef.getCurrentRoute()?.name === 'Call' && navigationRef.canGoBack()) {
    goBack();
  }
};

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const [streams, setStreams] = useState<{
    local: MediaStream | null;
    remote: MediaStream | null;
  }>({ local: null, remote: null });
  const isMounted = useRef(true);
  const { user } = useAuth();
  // Synchronous guard: blocks a second initiateCall while a peer connection is
  // still being set up (rapid taps would otherwise call cleanup() on a live/
  // mid-gathering PC, which is a native WebRTC abort trigger).
  const startingCallRef = useRef(false);

  // Live view of the latest state for socket handlers (avoids stale closures).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Always points at the latest handler closures so socket listeners, which are
  // registered once, never act on state from the first render.
  const handlersRef = useRef({
    onIncomingCall: (data: any) => {},
    onCallAnswer: (data: any) => {},
    onIceCandidate: (data: any) => {},
    onCallEnded: () => {},
    onCallRejected: () => {},
    onCallBusy: () => {},
  });

  // Stable socket-listener wrappers: they dispatch through handlersRef, so the
  // same listener functions can be cleanly removed in the cleanup below.
  const callListeners = useRef({
    incoming: (d: any) => handlersRef.current.onIncomingCall(d),
    offer: (d: any) => handlersRef.current.onIncomingCall(d),
    answer: (d: any) => handlersRef.current.onCallAnswer(d),
    ice: (d: any) => handlersRef.current.onIceCandidate(d),
    ended: () => handlersRef.current.onCallEnded(),
    end: () => handlersRef.current.onCallEnded(),
    rejected: () => handlersRef.current.onCallRejected(),
    reject: () => handlersRef.current.onCallRejected(),
    busy: () => handlersRef.current.onCallBusy(),
    disconnect: (reason: string) => {
      console.log('[Call] Socket disconnected:', reason);
      const status = stateRef.current.status;
      if (status === 'active' || status === 'outgoing') {
        dispatch({ type: 'SET_STATUS', status: 'reconnecting' });
      }
    },
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // InCallManager is initialized on call start (acceptCall), not on mount,
  // to avoid activating the proximity sensor when no call is active.

  // Initialize call signaling. Reuses the app-wide socketService socket (the
  // one registered with the backend's onlineUsers via addUser), so call events
  // relayed by the backend actually reach this client. The shared socket is
  // NOT disconnected on unmount — only the call listeners are removed.
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      let s = socketService.getSocket();
      if (!s?.connected) {
        s = await socketService.connect();
      }
      if (cancelled || !s) return;
      socket = s;

      const L = callListeners.current;
      s.on('disconnect', L.disconnect);
      s.on('call:incoming', L.incoming);
      s.on('call:offer', L.offer); // backend relays call:offer
      s.on('call:answer', L.answer);
      s.on('call:ice-candidate', L.ice);
      s.on('call:ended', L.ended);
      s.on('call:end', L.end);
      s.on('call:rejected', L.rejected);
      s.on('call:reject', L.reject);
      s.on('call:busy', L.busy);
    };

    setup();

    return () => {
      cancelled = true;
      if (socket) {
        const L = callListeners.current;
        socket.off('disconnect', L.disconnect);
        socket.off('call:incoming', L.incoming);
        socket.off('call:offer', L.offer);
        socket.off('call:answer', L.answer);
        socket.off('call:ice-candidate', L.ice);
        socket.off('call:ended', L.ended);
        socket.off('call:end', L.end);
        socket.off('call:rejected', L.rejected);
        socket.off('call:reject', L.reject);
        socket.off('call:busy', L.busy);
      }
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
    const myId = user?.id ?? 0;
    const events: WebRTCEvents = {
      onLocalStream: (stream) => {
        setStreams((prev) => ({ ...prev, local: stream }));
      },
      onRemoteStream: (stream) => {
        setStreams((prev) => ({ ...prev, remote: stream }));
      },
      onCallEnded: () => {
        handlersRef.current.onCallEnded();
      },
      onError: (error) => {
        console.error('[CallContext] WebRTC error:', error);
        handlersRef.current.onCallEnded();
      },
      onIceCandidate: (candidate) => {
        if (state.remoteUser?.userId && socket) {
          socket.emit('call:ice-candidate', {
            to: state.remoteUser.userId,
            from: myId,
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
            from: myId,
            fromName: user?.name ?? '',
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
            from: myId,
            answer,
          });
        }
      },
    };

    webRTCService.setEvents(events);

    return () => {
      webRTCService.setEvents({});
    };
  }, [state.remoteUser?.userId, state.sessionId, state.callType, socket, user?.id, user?.name]);

  // Handle incoming call
  const handleIncomingCall = useCallback(
    (data: { from: number; fromName: string; offer: any; sessionId: number; callType: string }) => {
      if (state.status !== 'idle') {
        socket?.emit('call:busy', { to: data.from, from: user?.id ?? 0 });
        return;
      }

      dispatch({ type: 'SET_REMOTE_USER', user: { userId: data.from, name: data.fromName, avatar: undefined } });
      dispatch({ type: 'SET_CALL_TYPE', callType: data.callType as 'audio' | 'video' });
      dispatch({ type: 'SET_SESSION_ID', sessionId: data.sessionId });
      dispatch({ type: 'SET_STATUS', status: 'incoming' });
      goToCallScreen();

      // Auto-reject after 30 seconds
      ringTimeout = setTimeout(() => {
        if (isMounted.current) rejectCall();
      }, 30000);

      // Set up WebRTC with the offer — await so the local stream/tracks are
      // added BEFORE the remote offer is applied (avoids a native race/crash).
      webRTCService
        .createPeerConnection(data.from, false, data.callType as 'audio' | 'video')
        .then(() => webRTCService.setRemoteOffer(data.offer))
        .catch((error) => {
          console.error('[CallContext] WebRTC incoming setup failed:', error);
          webRTCService.cleanup();
        });
    },
    [state.status, user?.id]
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
    startingCallRef.current = false;
    webRTCService.cleanup();
    InCallManager.stop();
    setStreams({ local: null, remote: null });
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
      leaveCallScreen();
    }
  }, []);

  const handleCallRejected = useCallback(() => {
    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }
    startingCallRef.current = false;
    webRTCService.cleanup();
    setStreams({ local: null, remote: null });
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
      leaveCallScreen();
    }
  }, []);

  const handleCallBusy = useCallback(() => {
    startingCallRef.current = false;
    webRTCService.cleanup();
    setStreams({ local: null, remote: null });
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
      leaveCallScreen();
    }
  }, []);

  // Actions
  const initiateCall = useCallback(
    (userId: number, name: string, callType: 'audio' | 'video', sessionId: number) => {
      if (state.status !== 'idle' || startingCallRef.current) return;
      startingCallRef.current = true;

      dispatch({ type: 'SET_REMOTE_USER', user: { userId, name, avatar: undefined } });
      dispatch({ type: 'SET_CALL_TYPE', callType });
      dispatch({ type: 'SET_SESSION_ID', sessionId });
      dispatch({ type: 'SET_STATUS', status: 'outgoing' });
      goToCallScreen();

      // Awaited so the offer is only sent after local media is attached, and
      // failures are handled instead of leaving a dangling peer connection.
      webRTCService
        .createPeerConnection(userId, true, callType)
        .then(() => {
          // Peer connection is set up (offer created) — allow future calls.
          startingCallRef.current = false;
        })
        .catch((error) => {
          console.error('[CallContext] initiateCall failed:', error);
          webRTCService.cleanup();
          if (isMounted.current) dispatch({ type: 'RESET' });
          startingCallRef.current = false;
        });
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

    // Create + send the SDP answer ONLY now, so the caller hears/sees nothing
    // until the callee actually accepts the call. Emitted via onAnswerCreated.
    webRTCService.createAnswer().catch((error) => {
      console.error('[CallContext] createAnswer failed:', error);
    });
  }, [state.status, state.callType]);

  const rejectCall = useCallback(() => {
    if (state.status !== 'incoming' && state.status !== 'outgoing') return;

    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }

    if (state.remoteUser?.userId && socket) {
      socket.emit('call:reject', { to: state.remoteUser.userId, from: user?.id ?? 0 });
    }

    webRTCService.cleanup();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
      leaveCallScreen();
    }
  }, [state.status, state.remoteUser?.userId, user?.id]);

  const endCall = useCallback(() => {
    // Either participant may end the call at any time (active, outgoing, or
    // while the callee is still ringing). While ringing, ending = rejecting.
    if (state.status !== 'active' && state.status !== 'outgoing' && state.status !== 'incoming') {
      return;
    }

    if (state.remoteUser?.userId && socket) {
      socket.emit(state.status === 'incoming' ? 'call:reject' : 'call:end', {
        to: state.remoteUser.userId,
        from: user?.id ?? 0,
      });
    }

    webRTCService.cleanup();
    InCallManager.stop();
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
      leaveCallScreen();
    }
  }, [state.status, state.remoteUser?.userId, user?.id]);

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

  // Keep handlersRef pointing at the latest useCallback versions. Placed after
  // the handler declarations so TypeScript sees them as already assigned.
  useEffect(() => {
    handlersRef.current = {
      onIncomingCall: handleIncomingCall,
      onCallAnswer: handleCallAnswer,
      onIceCandidate: handleIceCandidate,
      onCallEnded: handleCallEnded,
      onCallRejected: handleCallRejected,
      onCallBusy: handleCallBusy,
    };
  }, [handleIncomingCall, handleCallAnswer, handleIceCandidate, handleCallEnded, handleCallRejected, handleCallBusy]);

  const value: CallContextType = {
    state,
    localStream: streams.local,
    remoteStream: streams.remote,
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