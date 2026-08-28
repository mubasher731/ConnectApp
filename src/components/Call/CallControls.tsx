import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Mic, MicOff, Video, VideoOff, Phone, Volume2, RotateCcw } from 'lucide-react-native';
import { useCall } from '../../context/CallContext';
import { Colors } from '../../theme/colors';

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

      <View style={styles.controlsRow}>
        {state.callType === 'video' &&
          renderToggle('flip', <RotateCcw size={24} color={Colors.white} />, false, switchCamera)}

        {renderToggle(
          'mute',
          state.isMuted ? (
            <MicOff size={24} color={Colors.primary} />
          ) : (
            <Mic size={24} color={Colors.white} />
          ),
          state.isMuted,
          toggleMute
        )}

        {renderToggle(
          'speaker',
          <Volume2 size={24} color={state.isSpeakerOn ? Colors.primary : Colors.white} />,
          state.isSpeakerOn,
          toggleSpeaker
        )}

        {state.callType === 'video' &&
          renderToggle(
            'video',
            state.isVideoEnabled ? (
              <Video size={24} color={Colors.white} />
            ) : (
              <VideoOff size={24} color={Colors.primary} />
            ),
            !state.isVideoEnabled,
            toggleVideo
          )}

        {/* End call — red, same size, centered with the toggles */}
        <TouchableOpacity style={styles.endCallButton} onPress={onEndCall} activeOpacity={0.8}>
          <Phone size={26} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  mutedBadge: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  mutedBadgeText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  toggleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.white,
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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