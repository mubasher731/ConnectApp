import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import { Colors, Spacing, wp, ms, fs } from '../../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AppIcon name={icon} size={30} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  iconCircle: {
    width: wp(72),
    height: wp(72),
    borderRadius: ms(24),
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: fs(18),
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: fs(14),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: fs(21),
    marginBottom: Spacing.xl,
  },
});

export default EmptyState;
