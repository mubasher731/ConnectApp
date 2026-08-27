import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, MicOff, Video, VideoOff, Phone, Volume2, RotateCcw, X } from 'lucide-react-native';
import { useCall } from '../../context/CallContext';
import { Colors } from '../../theme/colors';

interface CallControlsProps {
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({ onEndCall }) => {
  const { state, toggleMute, toggleVideo, toggleSpeaker, switchCamera } = useCall();

  const controlButton = (icon: React.ReactNode, active: boolean, onPress: () => void, color = Colors.white) => (
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
            <RotateCcw size={24} color={Colors.white} />,
            false,
            switchCamera,
          )
        )}
        controlButton(
          state.isMuted ? <MicOff size={24} color={Colors.white} /> : <Mic size={24} color={Colors.white} />,
          state.isMuted,
          toggleMute,
        )
        controlButton(
          <Phone size={24} color={Colors.white} />,
          false,
          onEndCall,
          Colors.danger,
        )
        controlButton(
          state.isVideoEnabled && state.callType === 'video'
            ? <Video size={24} color={Colors.white} />
            : <VideoOff size={24} color={Colors.white} />,
          !state.isVideoEnabled || state.callType === 'audio',
          toggleVideo,
        )
        controlButton(
          state.isSpeakerOn
            ? <Volume2 size={24} color={Colors.white} />
            : <Volume2 size={24} color={Colors.grey} />,
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});