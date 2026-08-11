import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';
import { Colors, Spacing } from '../theme';

interface AuthHeaderProps {
  title: string;
  onBack?: () => void;
}

/**
 * Reusable header for authentication screens.
 * Renders a back arrow and the screen title aligned on the same line,
 * with the title always optically centered regardless of back visibility.
 */
const AuthHeader: React.FC<AuthHeaderProps> = ({ title, onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.sideSlot}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Spacer mirrors the back button so the title stays centered. */}
      <View style={styles.sideSlot} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  sideSlot: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
});

export default AuthHeader;
