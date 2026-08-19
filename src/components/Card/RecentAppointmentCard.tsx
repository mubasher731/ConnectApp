import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import DoctorPill from '../Doctor/DoctorPill';
import { APPOINTMENT_STATUS_META, URGENCY_META, DoctorAppointment } from '../../mock/doctorData';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface RecentAppointmentCardProps {
  appointment: DoctorAppointment;
  onViewDetails: () => void;
}

/** Compact appointment row on the doctor dashboard (view-only). */
const RecentAppointmentCard: React.FC<RecentAppointmentCardProps> = ({
  appointment,
  onViewDetails,
}) => {
  const status = APPOINTMENT_STATUS_META[appointment.status];
  const urgency = URGENCY_META[appointment.urgency];

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.patientInfo}>
          <Avatar name={appointment.patientName} size={40} />
          <View style={styles.patientMeta}>
            <Text style={styles.patientName}>{appointment.patientName}</Text>
            <Text style={styles.patientSub}>
              {appointment.patientId} · {appointment.date}
            </Text>
          </View>
        </View>
        <DoctorPill label={status.label} color={status.color} bg={status.bg} />
      </View>

      <View style={styles.metaRow}>
        <AppIcon name="time-outline" size={14} color={Colors.textTertiary} />
        <Text style={styles.meta}>{appointment.time}</Text>
        <DoctorPill label={urgency.label} color={urgency.color} bg={urgency.bg} />
      </View>

      <TouchableOpacity
        style={styles.viewBtn}
        onPress={onViewDetails}
        activeOpacity={0.85}
      >
        <Text style={styles.viewText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
};

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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  viewBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  viewText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RecentAppointmentCard;
