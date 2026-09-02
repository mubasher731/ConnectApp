import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionStatus } from '../../types';
import { Colors, Radius, Spacing, ms, fs } from '../../theme';

const STATUS_META: Record<
  SessionStatus,
  { label: string; bg: string; color: string }
> = {
  // Upcoming → Yellow, Active → Green, Consulted → Blue,
  // No Show → Red, Pending → Orange, Rejected → Gray.
  scheduled: { label: 'Upcoming', bg: Colors.warningSoft, color: Colors.warning },
  active: { label: 'Active', bg: Colors.successSoft, color: Colors.success },
  completed: { label: 'Consulted', bg: Colors.infoSoft, color: Colors.info },
  missed: { label: 'No Show', bg: Colors.errorSoft, color: Colors.error },
  pending: { label: 'Pending', bg: Colors.orangeSoft, color: Colors.orange },
  rejected: { label: 'Rejected', bg: 'rgba(154,163,196,0.14)', color: Colors.textSecondary },
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
    paddingVertical: ms(3),
  },
  label: {
    fontSize: fs(11),
    fontWeight: '700',
  },
});

export default StatusBadge;
