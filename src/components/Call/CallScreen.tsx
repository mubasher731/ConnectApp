import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, Animated, Easing } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Clock, Wifi, WifiOff, AlertCircle } from 'lucide-react-native';
import { useCall } from '../../context/CallContext';
import { CallControls } from './CallControls';
import { IncomingCallModal } from './IncomingCallModal';
import { Colors, Spacing, wp, ms, fs } from '../../theme';

export const CallScreen: React.FC = () => {
  const { state, endCall, acceptCall, rejectCall, localStream, remoteStream } = useCall();
  const [connectionQuality, setConnectionQuality] = React.useState<'good' | 'poor' | 'disconnected' | null>(null);
  const [opacity] = React.useState(new Animated.Value(0));
  const [scale] = React.useState(new Animated.Value(0.95));

  // Animate incoming
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Connection quality indicator based on state. 'new'/'connecting' means the
  // call is still being established — show NO indicator yet (the initial state
  // is also null), so an outgoing/incoming call doesn't falsely show a poor
  // connection before it has even connected.
  useEffect(() => {
    switch (state.connectionState) {
      case 'connected':
        setConnectionQuality('good');
        break;
      case 'disconnected':
      case 'failed':
      case 'closed':
        setConnectionQuality('disconnected');
        break;
      default:
        setConnectionQuality(null);
        break;
    }
  }, [state.connectionState]);

  const getConnectionIcon = () => {
    if (!connectionQuality) return null;
    switch (connectionQuality) {
      case 'good':
        return <Wifi size={16} color={Colors.success} />;
      case 'poor':
        return <WifiOff size={16} color={Colors.warning} />;
      case 'disconnected':
        return <AlertCircle size={16} color="#DC2626" />;
      default:
        return null;
    }
  };

  if (state.status === 'idle') {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Status Bar Area */}
      <View style={styles.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View
            style={{
              ...styles.remoteAvatar,
              opacity,
              transform: [{ scale }],
            }}
          >
            {state.remoteUser?.avatar ? (
              <Image
                source={{ uri: state.remoteUser.avatar }}
                style={styles.remoteAvatarImage}
              />
            ) : (
              <Text style={styles.remoteAvatarText}>
                {state.remoteUser?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </Animated.View>
          <View style={styles.headerInfo}>
            <Text style={styles.remoteName}>{state.remoteUser?.name || 'Connecting...'}</Text>
            <View style={styles.statusRow}>
              <Text style={[
                styles.statusText,
                state.status === 'active' && styles.statusActive,
                state.status === 'outgoing' && styles.statusOutgoing,
                state.status === 'incoming' && styles.statusIncoming,
              ]}>
                {state.status === 'active' && formatDuration(state.duration)}
                {state.status === 'outgoing' && 'Calling...'}
                {state.status === 'incoming' && 'Incoming call'}
                {state.status === 'reconnecting' && 'Reconnecting...'}
              </Text>
              {state.status === 'active' && (
                <View style={styles.connectionQuality}>
                  {getConnectionIcon()}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Remote Video - Full Screen */}
      <View style={styles.remoteVideoContainer}>
        {state.remoteUser && remoteStream && state.callType === 'video' && (
          <RTCView
            style={styles.remoteVideo}
            streamURL={remoteStream.toURL()}
            objectFit="cover"
            zOrder={1}
          />
        )}
        {!state.remoteUser && (
          <View style={[styles.remoteVideo, styles.connectingOverlay]}>
            <Text style={styles.connectingText}>
              {state.status === 'outgoing' ? 'Connecting...' : 'Waiting for video...'}
            </Text>
          </View>
        )}
        {state.callType === 'audio' && (
          <View style={[styles.remoteVideo, styles.audioOnlyOverlay]}>
            <View style={styles.audioAvatar}>
              {state.remoteUser?.avatar ? (
                <Image
                  source={{ uri: state.remoteUser.avatar }}
                  style={styles.audioAvatarImage}
                />
              ) : (
                <Text style={styles.audioAvatarText}>
                  {state.remoteUser?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <Text style={styles.audioOnlyText}>Audio Call</Text>
          </View>
        )}
      </View>

      {/* Local Video - PiP (shows as soon as local media is ready) */}
      {state.callType === 'video' && localStream && (
        <View style={styles.localVideoContainer}>
          <RTCView
            style={styles.localVideo}
            streamURL={localStream.toURL()}
            objectFit="cover"
            zOrder={2}
            mirror={true}
          />
        </View>
      )}

      {/* Call Controls */}
      <CallControls onEndCall={endCall} />

      {/* Status indicators */}
      {state.callType === 'video' && !state.isVideoEnabled && (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>📷 Camera Off</Text>
        </View>
      )}

      {/* Incoming call overlay: Accept / Decline for the callee */}
      <IncomingCallModal
        visible={state.status === 'incoming'}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statusBar: {
    height: 44, // iOS status bar height
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remoteAvatar: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  remoteAvatarImage: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
  },
  remoteAvatarText: {
    fontSize: fs(16),
    fontWeight: '600',
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  remoteName: {
    fontSize: fs(17),
    fontWeight: '600',
    color: Colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: ms(2),
  },
  statusText: {
    fontSize: fs(13),
    color: Colors.textSecondary,
  },
  statusActive: {
    color: Colors.success,
    fontWeight: '500',
  },
  statusOutgoing: {
    color: Colors.warning,
  },
  statusIncoming: {
    color: Colors.primary,
  },
  connectionQuality: {
    marginLeft: Spacing.xs,
  },
  remoteVideoContainer: {
    flex: 1,
    width: '100%',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
  },
  connectingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  connectingText: {
    fontSize: fs(16),
    color: Colors.textSecondary,
  },
  audioOnlyOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  audioAvatar: {
    width: wp(120),
    height: wp(120),
    borderRadius: wp(60),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  audioAvatarImage: {
    width: wp(120),
    height: wp(120),
    borderRadius: wp(60),
  },
  audioAvatarText: {
    fontSize: fs(48),
    fontWeight: '600',
    color: Colors.white,
  },
  audioOnlyText: {
    fontSize: fs(18),
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // WhatsApp-style rounded PiP: a dark rounded frame with no border. Android's
  // native video surface can't be clipped to rounded corners, so we keep the
  // container rounded + dark so it reads as a clean rounded thumbnail.
  localVideoContainer: {
    position: 'absolute',
    top: 100,
    right: Spacing.lg,
    width: wp(112),
    height: wp(156),
    borderRadius: ms(20),
    overflow: 'hidden',
    backgroundColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  localVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: ms(18),
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    bottom: 160,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: ms(20),
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: fs(12),
    color: Colors.white,
    fontWeight: '500',
  },
});