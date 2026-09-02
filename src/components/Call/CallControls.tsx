import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react-native';
import Ionicon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useCall } from '../../context/CallContext';
import { Colors } from '../../theme/colors';
import { responsiveSize, ms, fs } from '../../theme';

interface CallControlsProps {
  onEndCall: () => void;
}

/**
 * WhatsApp-style call controls.
 * - Single toggle buttons (Mute / Speaker / Video): white circle + colored icon when active.
 * - Distinct red End Call button pinned to the far right.
 * - "Call Muted" pill shown above the controls while muted.
 */
export const CallControls: React.FC<CallControlsProps> = ({ onEndCall }) => {
  const { state, toggleMute, toggleVideo, toggleSpeaker, switchCamera } = useCall();
  const iconSize = responsiveSize(22);

  const renderToggle = (
    key: string,
    icon: React.ReactNode,
    active: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {state.isMuted && (
        <View style={styles.mutedBadge}>
          <Text style={styles.mutedBadgeText}>Call Muted</Text>
        </View>
      )}

      {/* WhatsApp-style grouped card for all call controls */}
      <View style={styles.controlsCard}>
        {state.callType === 'video' &&
          renderToggle(
            'flip',
            <Ionicon name="camera-reverse-outline" size={iconSize} color={Colors.white} />,
            false,
            switchCamera
          )}

        {renderToggle(
          'mute',
          state.isMuted ? (
            <MicOff size={iconSize} color={Colors.primary} />
          ) : (
            <Mic size={iconSize} color={Colors.white} />
          ),
          state.isMuted,
          toggleMute
        )}

        {renderToggle(
          'speaker',
          <Volume2 size={iconSize} color={state.isSpeakerOn ? Colors.primary : Colors.white} />,
          state.isSpeakerOn,
          toggleSpeaker
        )}

        {state.callType === 'video' &&
          renderToggle(
            'video',
            state.isVideoEnabled ? (
              <Video size={iconSize} color={Colors.white} />
            ) : (
              <VideoOff size={iconSize} color={Colors.primary} />
            ),
            !state.isVideoEnabled,
            toggleVideo
          )}

        {/* End call — red, Material call_end (WhatsApp-style handset) */}
        <TouchableOpacity style={styles.endCallButton} onPress={onEndCall} activeOpacity={0.8}>
          <MaterialIcon name="call-end" size={iconSize} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: responsiveSize(18),
    paddingBottom: responsiveSize(30),
  },
  mutedBadge: {
    alignSelf: 'center',
    marginBottom: responsiveSize(14),
    paddingHorizontal: responsiveSize(14),
    paddingVertical: responsiveSize(6),
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  mutedBadgeText: {
    color: Colors.white,
    fontSize: fs(13),
    fontWeight: '500',
  },
  // WhatsApp-style: all controls grouped inside a single rounded card.
  controlsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(12),
    paddingVertical: responsiveSize(16),
    paddingHorizontal: responsiveSize(12),
    borderRadius: responsiveSize(30),
    backgroundColor: 'rgba(18, 22, 40, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  // Buttons flex to fit any screen width (flex:1 + aspectRatio keeps them round)
  // and cap out on large screens so they don't get oversized.
  toggleButton: {
    flex: 1,
    maxWidth: ms(62),
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.white,
  },
  endCallButton: {
    flex: 1,
    maxWidth: ms(62),
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});