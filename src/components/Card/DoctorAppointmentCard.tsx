import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import DoctorPill from '../Doctor/DoctorPill';
import {
  APPOINTMENT_STATUS_META,
  URGENCY_META,
  SEVERITY_META,
  DoctorAppointment,
} from '../../mock/doctorData';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface DoctorAppointmentCardProps {
  appointment: DoctorAppointment;
}

/** Consultation request card for the doctor's consultations list. */
const DoctorAppointmentCard: React.FC<DoctorAppointmentCardProps> = ({
  appointment,
}) => {
  const status = APPOINTMENT_STATUS_META[appointment.status];
  const urgency = URGENCY_META[appointment.urgency];
  const severity = SEVERITY_META[appointment.severity];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Avatar name={appointment.patientName} size={42} />
          <View style={styles.patientMeta}>
            <Text style={styles.patientName}>{appointment.patientName}</Text>
            <Text style={styles.patientId}>{appointment.patientId}</Text>
          </View>
        </View>
        <DoctorPill label={status.label} color={status.color} bg={status.bg} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <AppIcon name="calendar-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>Requested {appointment.requestedDate}</Text>
        </View>
        <View style={styles.metaItem}>
          <AppIcon name="time-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{appointment.time}</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <View style={styles.severityPill}>
          <View style={[styles.severityDot, { backgroundColor: severity.color }]} />
          <Text style={[styles.severityText, { color: severity.color }]}>
            {severity.label}
          </Text>
        </View>
        <DoctorPill label={urgency.label} color={urgency.color} bg={urgency.bg} />
      </View>
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
  cardHeader: {
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
  patientId: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default DoctorAppointmentCard;
