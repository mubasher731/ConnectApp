import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import { StatConfig } from '../../context/appData';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

interface StatCardProps {
  config: StatConfig;
  value: number;
}

/** Doctor dashboard stat tile: icon + value + label. */
const StatCard: React.FC<StatCardProps> = ({ config, value }) => (
  <View style={styles.card}>
    <View style={[styles.icon, { backgroundColor: config.bg }]}>
      <AppIcon name={config.icon} size={20} color={config.color} />
    </View>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{config.label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: responsiveSize(26),
    fontWeight: '800',
    color: Colors.text,
  },
  label: {
    fontSize: responsiveSize(13),
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default StatCard;
