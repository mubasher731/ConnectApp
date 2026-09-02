import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { ReactNode } from 'react';
import { Colors, Radius, Shadows, Spacing, wp, fs } from '../../theme';

export type AlertActionStyle = 'default' | 'cancel' | 'destructive';

export interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: AlertActionStyle;
}

export interface CustomAlertOptions {
  title?: string;
  message?: string;
  actions?: AlertAction[];
  icon?: ReactNode;
  dismissable?: boolean;
}

interface CustomAlertProps extends CustomAlertOptions {
  visible: boolean;
  onDismiss?: () => void;
}

/**
 * Single reusable alert modal used everywhere instead of the system default
 * Alert. Consistent, polished layout matching the app's dark theme.
 */
export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  actions = [{ text: 'OK' }],
  icon,
  dismissable = true,
  onDismiss,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={dismissable ? onDismiss : undefined}
  >
    <Pressable
      style={styles.backdrop}
      onPress={dismissable ? onDismiss : undefined}
    >
      <Pressable
        style={styles.card}
        onPress={(event) => event.stopPropagation()}
      >
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}

        {title ? <Text style={styles.title}>{title}</Text> : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.actionsRow}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={`${action.text}-${index}`}
              style={[
                styles.actionBtn,
                action.style === 'cancel' && styles.cancelBtn,
                action.style === 'destructive' && styles.destructiveBtn,
              ]}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.actionText,
                  action.style === 'cancel' && styles.cancelText,
                  action.style === 'destructive' && styles.destructiveText,
                ]}
              >
                {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: wp(380),
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.raised,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: fs(20),
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: fs(15),
    lineHeight: fs(22),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  cancelBtn: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.raised,
  },
  destructiveBtn: {
    backgroundColor: Colors.error,
    ...Shadows.raised,
  },
  actionText: {
    fontSize: fs(15),
    fontWeight: '700',
    color: Colors.white,
  },
  cancelText: {
    color: Colors.textSecondary,
  },
  destructiveText: {
    color: Colors.white,
  },
});

export default CustomAlert;
