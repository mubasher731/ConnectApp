import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, ReactNode, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../api/socket';
import { navigationRef, navigate, goBack } from '../navigation/navigationRef';
import { useAuth } from './AuthContext';
import { webRTCService, WebRTCEvents } from '../services/WebRTCService';
import { sessionService } from '../services/sessionService';
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
  /** True once the local peer connection + remote offer are set up, so the callee can safely answer. */
  peerReady: boolean;
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
  | { type: 'SET_PEER_READY'; ready: boolean }
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
  peerReady: false,
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
    case 'SET_PEER_READY':
      return { ...state, peerReady: action.ready };
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
  if (!navigationRef.isReady()) return;
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

  // Call parameters captured at call start. Socket handlers read from this ref
  // instead of React state so an offer/answer is still emitted even if the
  // peer connection resolves before the state-update effect re-runs — the old
  // state-closure approach could silently skip the emit (call never goes out).
  const callParamsRef = useRef<{
    targetId: number | null;
    myId: number;
    myName: string;
    sessionId: number | null;
    callType: 'audio' | 'video';
  }>({ targetId: null, myId: 0, myName: '', sessionId: null, callType: 'video' });

  // Tracks whether InCallManager was started so we never call stop() on a
  // manager that was never started — native audio routing breaks on the 2nd+
  // call if stop() runs without a prior start() (call ends while still ringing,
  // call rejected, connection drops before answer, etc.).
  const inCallManagerStarted = useRef(false);
  const startInCallManager = (media: 'audio' | 'video') => {
    InCallManager.start({ media });
    InCallManager.setSpeakerphoneOn(true);
    inCallManagerStarted.current = true;
  };
  const stopInCallManager = () => {
    if (inCallManagerStarted.current) {
      InCallManager.stop();
      inCallManagerStarted.current = false;
    }
  };

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
  // relayed by the backend actually reach this client. Keyed on user?.id so the
  // listeners are re-registered on the FRESH socket after a logout → login
  // cycle (socketService.connect() creates a new Socket object each time, so
  // listeners registered once on mount would stay on the dead old socket and
  // incoming calls would be silently lost). The shared socket is NOT
  // disconnected on unmount — only the call listeners are removed.
  useEffect(() => {
    if (!user?.id) {
      // Signed out — drop the stale socket ref and reset any in-flight call so
      // the next login starts from a clean 'idle' state.
      socket = null;
      dispatch({ type: 'RESET' });
      return;
    }
    let cancelled = false;
    let reRegister: (() => void) | null = null;

    const register = (target: Socket) => {
      const L = callListeners.current;
      target.on('disconnect', L.disconnect);
      target.on('call:incoming', L.incoming);
      target.on('call:offer', L.offer); // backend relays call:offer
      target.on('call:answer', L.answer);
      target.on('call:ice-candidate', L.ice);
      target.on('call:ended', L.ended);
      target.on('call:end', L.end);
      target.on('call:rejected', L.rejected);
      target.on('call:reject', L.reject);
      target.on('call:busy', L.busy);
    };
    const unregister = (target: Socket) => {
      const L = callListeners.current;
      target.off('disconnect', L.disconnect);
      target.off('call:incoming', L.incoming);
      target.off('call:offer', L.offer);
      target.off('call:answer', L.answer);
      target.off('call:ice-candidate', L.ice);
      target.off('call:ended', L.ended);
      target.off('call:end', L.end);
      target.off('call:rejected', L.rejected);
      target.off('call:reject', L.reject);
      target.off('call:busy', L.busy);
    };

    const setup = async () => {
      // Prefer the existing socket when present (socket.io reconnects the same
      // instance, so listeners persist). Only create one when there is no socket
      // at all (initial mount after auth, or right after logout).
      let s = socketService.getSocket();
      if (!s) {
        s = await socketService.connect();
      }
      if (cancelled || !s) return;
      socket = s;

      register(s);
      // Re-register on every (re)connect so call listeners are always on the
      // live socket — even if a socket is created/recreated outside a user
      // change (off-first prevents duplicates).
      reRegister = () => {
        unregister(s);
        register(s);
      };
      s.on('connect', reRegister);
    };

    setup();

    return () => {
      cancelled = true;
      if (socket) {
        if (reRegister) socket.off('connect', reRegister);
        unregister(socket);
      }
      socket = null;
    };
  }, [user?.id]);

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
        const p = callParamsRef.current;
        const sender = p.myId || myId;
        if (p.targetId && socket) {
          socket.emit('call:ice-candidate', {
            to: p.targetId,
            from: sender,
            candidate,
          });
        } else {
          console.warn('[Call] ICE candidate skipped — no target/socket', {
            targetId: p.targetId,
            socket: !!socket,
            connected: socket?.connected,
          });
        }
      },
      onConnectionStateChange: (connectionState) => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: connectionState });
      },
      onOfferCreated: (offer) => {
        const p = callParamsRef.current;
        const sender = p.myId || myId;
        if (p.targetId && socket) {
          console.log('[Call] Emitting call:offer →', p.targetId, p.callType, 'session', p.sessionId);
          socket.emit('call:offer', {
            to: p.targetId,
            from: sender,
            fromName: p.myName || user?.name || '',
            offer,
            sessionId: p.sessionId,
            callType: p.callType,
          });
        } else {
          console.warn('[Call] Offer NOT emitted — missing target/socket', {
            targetId: p.targetId,
            socket: !!socket,
            connected: socket?.connected,
          });
        }
      },
      onAnswerCreated: (answer) => {
        const p = callParamsRef.current;
        const sender = p.myId || myId;
        if (p.targetId && socket) {
          socket.emit('call:answer', {
            to: p.targetId,
            from: sender,
            answer,
          });
        } else {
          console.warn('[Call] Answer NOT emitted — missing target/socket', {
            targetId: p.targetId,
            socket: !!socket,
            connected: socket?.connected,
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
    (data: { from: number; fromName?: string; offer: any; sessionId: number; callType: string }) => {
      if (state.status !== 'idle') {
        socket?.emit('call:busy', { to: data.from, from: user?.id ?? 0 });
        return;
      }

      const myId = user?.id ?? 0;
      // Capture the call context so accept/answer emits route correctly.
      callParamsRef.current = {
        targetId: data.from,
        myId,
        myName: user?.name ?? '',
        sessionId: data.sessionId,
        callType: data.callType as 'audio' | 'video',
      };

      dispatch({ type: 'SET_REMOTE_USER', user: { userId: data.from, name: data.fromName ?? '', avatar: undefined } });
      dispatch({ type: 'SET_CALL_TYPE', callType: data.callType as 'audio' | 'video' });
      dispatch({ type: 'SET_SESSION_ID', sessionId: data.sessionId });
      dispatch({ type: 'SET_STATUS', status: 'incoming' });
      goToCallScreen();

      // The backend relay may not forward fromName, so resolve the caller's real
      // name from the conversation (doctor_name/patient_name) and refresh the UI
      // when found — the incoming screen must show the caller, never "Unknown".
      const resolveCallerName = async (): Promise<string> => {
        if (data.fromName && data.fromName.trim()) return data.fromName;
        try {
          const convs = await sessionService.getConversations();
          const conv = convs.find((c) => String(c.id) === String(data.sessionId));
          if (conv) {
            const iAmPatient = conv.patient_id === myId;
            const name = iAmPatient ? conv.doctor_name : conv.patient_name;
            if (name && name.trim()) return name;
          }
        } catch (e) {
          console.warn('[Call] Could not resolve caller name:', e);
        }
        return data.fromName ?? '';
      };
      resolveCallerName().then((name) => {
        if (isMounted.current && name) {
          dispatch({
            type: 'SET_REMOTE_USER',
            user: { userId: data.from, name, avatar: undefined },
          });
        }
      });

      // Auto-reject after 30 seconds
      ringTimeout = setTimeout(() => {
        if (isMounted.current) rejectCall();
      }, 30000);

      // Set up WebRTC with the offer — await so the local stream/tracks are
      // added BEFORE the remote offer is applied (avoids a native race/crash).
      webRTCService
        .createPeerConnection(data.from, false, data.callType as 'audio' | 'video')
        .then(() => webRTCService.setRemoteOffer(data.offer))
        .then(() => {
          // Peer connection + remote offer are ready — the callee can now safely
          // accept (createAnswer() would no-op on a null peer connection, leaving
          // the caller on "Calling..." until the 30s auto-reject).
          if (isMounted.current) dispatch({ type: 'SET_PEER_READY', ready: true });
        })
        .catch((error) => {
          console.error('[CallContext] WebRTC incoming setup failed:', error);
          // onError already ended the call (cleanup + RESET); just clear the
          // readiness flag so the UI doesn't offer Accept on a dead call.
          if (isMounted.current) dispatch({ type: 'SET_PEER_READY', ready: false });
        });
    },
    [state.status, user?.id, user?.name]
  );

  const handleCallAnswer = useCallback(
    (data: { from: number; answer: any }) => {
      if (state.status === 'outgoing' && state.remoteUser?.userId === data.from) {
        webRTCService.setRemoteAnswer(data.answer);
        if (isMounted.current) {
          dispatch({ type: 'SET_STATUS', status: 'active' });
          dispatch({ type: 'SET_DURATION', duration: 0 });
          // Start InCallManager for the caller side too
          startInCallManager(state.callType === 'video' ? 'video' : 'audio');
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
    callParamsRef.current.targetId = null;
    webRTCService.cleanup();
    stopInCallManager();
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
    callParamsRef.current.targetId = null;
    webRTCService.cleanup();
    stopInCallManager();
    setStreams({ local: null, remote: null });
    if (isMounted.current) {
      dispatch({ type: 'RESET' });
      leaveCallScreen();
    }
  }, []);

  const handleCallBusy = useCallback(() => {
    startingCallRef.current = false;
    callParamsRef.current.targetId = null;
    webRTCService.cleanup();
    stopInCallManager();
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

      // Capture the call context up front so the offer emit never reads stale
      // state (the previous closure-based read could miss the dispatch update
      // and skip the call:offer emit entirely).
      callParamsRef.current = {
        targetId: userId,
        myId: user?.id ?? 0,
        myName: user?.name ?? '',
        sessionId,
        callType,
      };

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
          if (isMounted.current) dispatch({ type: 'SET_PEER_READY', ready: true });
        })
        .catch((error) => {
          console.error('[CallContext] initiateCall failed:', error);
          // onError already ended the call (cleanup + RESET + leaveCallScreen);
          // just release the guard so future calls aren't blocked.
          startingCallRef.current = false;
        });
      // Offer will be sent via onOfferCreated event
    },
    [state.status, user?.id, user?.name]
  );

  const acceptCall = useCallback(() => {
    // Don't answer before the peer connection + remote offer are ready —
    // createAnswer() would silently no-op and the caller would hang on
    // "Calling..." until the 30s auto-reject.
    if (state.status !== 'incoming' || !state.peerReady) return;

    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }

    dispatch({ type: 'SET_STATUS', status: 'active' });
    dispatch({ type: 'SET_DURATION', duration: 0 });

    // Start InCallManager
    startInCallManager(state.callType === 'video' ? 'video' : 'audio');

    // Create + send the SDP answer ONLY now, so the caller hears/sees nothing
    // until the callee actually accepts the call. Emitted via onAnswerCreated.
    webRTCService.createAnswer().catch((error) => {
      console.error('[CallContext] createAnswer failed:', error);
    });
  }, [state.status, state.peerReady, state.callType]);

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
    stopInCallManager();
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