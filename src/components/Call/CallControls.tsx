import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, MicOff, Video, VideoOff, Phone, Volume2, RotateCcw, X } from 'lucide-react-native';
import { useCall } from '../../context/CallContext';
import { COLORS } from '../../theme/colors';

interface CallControlsProps {
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({ onEndCall }) => {
  const { state, toggleMute, toggleVideo, toggleSpeaker, switchCamera } = useCall();

  const controlButton = (icon: React.ReactNode, active: boolean, onPress: () => void, color = COLORS.white) => (
    <TouchableOpacity
      style={[
        styles.controlButton,
        active && styles.controlButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        {state.callType === 'video' && (
          controlButton(
            <RotateCcw size={24} color={COLORS.white} />,
            false,
            switchCamera,
          )
        )}
        controlButton(
          state.isMuted ? <MicOff size={24} color={COLORS.white} /> : <Mic size={24} color={COLORS.white} />,
          state.isMuted,
          toggleMute,
        )
        controlButton(
          <Phone size={24} color={COLORS.white} />,
          false,
          onEndCall,
          COLORS.danger,
        )
        controlButton(
          state.isVideoEnabled && state.callType === 'video'
            ? <Video size={24} color={COLORS.white} />
            : <VideoOff size={24} color={COLORS.white} />,
          !state.isVideoEnabled || state.callType === 'audio',
          toggleVideo,
        )
        controlButton(
          state.isSpeakerOn
            ? <Volume2 size={24} color={COLORS.white} />
            : <Volume2 size={24} color={COLORS.grey} />,
          state.isSpeakerOn,
          toggleSpeaker,
        )
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});