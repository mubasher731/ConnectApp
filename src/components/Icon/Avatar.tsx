import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, wp } from '../../theme';

type AvatarShape = 'circle' | 'squircle';

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
  style?: ViewStyle;
  avatarUrl?: string | null;
  /** Shape of the avatar container. Defaults to a circle. */
  shape?: AvatarShape;
}

/** Initials-based avatar with optional online indicator. */
const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 52,
  online = false,
  style,
  avatarUrl,
  shape = 'circle',
}) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Scale the design-pixel size prop at the point of use so the avatar stays
  // proportional on every screen; the public `size` prop remains a plain number.
  const avatarSize = wp(size);
  const dotSize = Math.max(12, avatarSize * 0.26);
  const borderRadius = shape === 'circle' ? avatarSize / 2 : avatarSize * 0.36;

  return (
    <View style={[styles.wrapper, { width: avatarSize, height: avatarSize }, style]}>
      <View
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius },
        ]}
      >
        {avatarUrl ? null : <Text style={[styles.initials, { fontSize: avatarSize * 0.34 }]}>{initials}</Text>}
      </View>
      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              borderWidth: Math.max(2, dotSize * 0.16),
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -2,
    backgroundColor: Colors.success,
    borderColor: Colors.white,
  },
});

export default Avatar;
