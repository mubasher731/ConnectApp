import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import DoctorPill from '../Doctor/DoctorPill';
import { BookingRequest } from '../../mock/bookingStore';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface AppointmentRequestCardProps {
  request: BookingRequest;
  onAccept: () => void;
  onReject: () => void;
}

/** Pending request badge — fixed until the store surfaces richer statuses. */
const PENDING_META = { label: 'Pending', color: '#F59E0B', bg: '#FEF3E0' };

/** Incoming patient appointment request with Accept / Reject actions. */
const AppointmentRequestCard: React.FC<AppointmentRequestCardProps> = ({
  request,
  onAccept,
  onReject,
}) => (
  <View style={styles.card}>
    <View style={styles.top}>
      <View style={styles.patientInfo}>
        <Avatar name={request.patientName} size={40} />
        <View style={styles.patientMeta}>
          <Text style={styles.patientName}>{request.patientName}</Text>
          <Text style={styles.patientSub}>Requested {request.timeSlot}</Text>
        </View>
      </View>
      <DoctorPill
        label={PENDING_META.label}
        color={PENDING_META.color}
        bg={PENDING_META.bg}
      />
    </View>

    <View style={styles.messageRow}>
      <AppIcon
        name="chatbubble-ellipses-outline"
        size={14}
        color={Colors.textTertiary}
      />
      <Text style={styles.message} numberOfLines={2}>
        {request.message}
      </Text>
    </View>

    <View style={styles.actionRow}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.acceptBtn]}
        onPress={onAccept}
        activeOpacity={0.85}
      >
        <AppIcon name="checkmark" size={16} color={Colors.white} />
        <Text style={styles.actionText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, styles.rejectBtn]}
        onPress={onReject}
        activeOpacity={0.85}
      >
        <AppIcon name="close" size={16} color={Colors.white} />
        <Text style={styles.actionText}>Reject</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  patientMeta: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  patientSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
  },
  acceptBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.error,
    marginRight: 0,
  },
  actionText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
});

export default AppointmentRequestCard;
