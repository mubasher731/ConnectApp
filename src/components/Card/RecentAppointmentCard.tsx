import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import Avatar from '../Icon/Avatar';
import DoctorPill from '../Doctor/DoctorPill';
import { CONVERSATION_STATE_META } from '../../context/appData';
import { Conversation } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface RecentAppointmentCardProps {
  conversation: Conversation;
  onViewDetails: () => void;
}

/** Compact appointment row on the doctor dashboard (view-only). */
const RecentAppointmentCard: React.FC<RecentAppointmentCardProps> = ({
  conversation,
  onViewDetails,
}) => {
  const meta = CONVERSATION_STATE_META[conversation.state];
  const start = dayjs(conversation.scheduled_start);
  const name = conversation.patient_name ?? `Patient #${conversation.patient_id}`;
  const timeLabel = start.isValid() ? start.format('MMM D, h:mm A') : '';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.patientInfo}>
          <Avatar name={name} size={40} />
          <View style={styles.patientMeta}>
            <Text style={styles.patientName} numberOfLines={1}>
              {name}
            </Text>
            {timeLabel ? <Text style={styles.patientSub}>{timeLabel}</Text> : null}
          </View>
        </View>
        <DoctorPill label={meta.label} color={meta.color} bg={meta.bg} />
      </View>

      <TouchableOpacity style={styles.viewBtn} onPress={onViewDetails} activeOpacity={0.85}>
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
