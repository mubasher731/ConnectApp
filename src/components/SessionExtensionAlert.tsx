import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AppIcon from './Icon/AppIcon';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../theme';

interface SessionExtensionAlertProps {
  visible: boolean;
  /** Seconds remaining (used in the title). */
  secondsLeft?: number;
  onCancel: () => void;
  onExtend: () => void;
}

/** Full-screen alert shown on the doctor's screen 1 minute before the session ends. */
const SessionExtensionAlert: React.FC<SessionExtensionAlertProps> = ({
  visible,
  secondsLeft = 60,
  onCancel,
  onExtend,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <AppIcon name="alarm-outline" size={44} color={Colors.warning} />
        </View>

        <Text style={styles.title}>Session ending in {secondsLeft} seconds</Text>
        <Text style={styles.message}>
          Session about to end. Extend by 5 minutes?
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.extendButton]}
            onPress={onExtend}
            activeOpacity={0.85}
          >
            <AppIcon name="add" size={18} color={Colors.white} />
            <Text style={styles.extendText}>Extend +5 min</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 17, 26, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.raised,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: Radius.round,
    backgroundColor: Colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: responsiveSize(20),
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: responsiveSize(15),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xs,
  },
  cancelButton: {
    backgroundColor: Colors.inputBackground,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  extendButton: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  extendText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
});

export default SessionExtensionAlert;
