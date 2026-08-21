import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionStatus } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';

const STATUS_META: Record<
  SessionStatus,
  { label: string; bg: string; color: string }
> = {
  scheduled: { label: 'Upcoming', bg: '#E8F0FE', color: Colors.info },
  active: { label: 'Active', bg: Colors.primarySoft, color: Colors.primary },
  completed: { label: 'Consulted', bg: Colors.successSoft, color: Colors.success },
  missed: { label: 'No Show', bg: Colors.errorSoft, color: Colors.error },
  pending: { label: 'Pending', bg: Colors.warningSoft, color: Colors.warning },
};

/** Public accessor so cards can reuse the status label/colors. */
export const getStatusMeta = (status?: SessionStatus) =>
  status ? STATUS_META[status] : undefined;

const StatusBadge: React.FC<{ status?: SessionStatus }> = ({ status }) => {
  if (!status || !STATUS_META[status]) return null;
  const meta = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default StatusBadge;
