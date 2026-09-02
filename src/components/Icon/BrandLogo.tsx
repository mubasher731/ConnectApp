import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, wp, ms, fs } from '../../theme';

interface BrandLogoProps {
  /** Display size of the logo mark. */
  size?: 'medium' | 'large';
}

/**
 * Centered app logo mark + "ConnectApp" wordmark, used across
 * authentication screens to keep branding consistent.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'medium' }) => {
  const isLarge = size === 'large';
  const markSize = wp(isLarge ? 72 : 64);
  const fontSize = fs(isLarge ? 26 : 22);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius: markSize * 0.34,
          },
        ]}
      >
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotSmall]} />
      </View>
      <Text style={[styles.wordmark, { fontSize }]}>
        Connect<Text style={styles.wordmarkApp}>App</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mark: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  dot: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: Colors.white,
    marginBottom: ms(3),
  },
  dotSmall: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    alignSelf: 'flex-end',
    marginRight: ms(11),
    marginTop: -1,
  },
  wordmark: {
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  wordmarkApp: {
    color: Colors.text,
  },
});

export default BrandLogo;
