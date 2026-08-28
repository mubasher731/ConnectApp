import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import Avatar from '../Icon/Avatar';
import DoctorPill from '../Doctor/DoctorPill';
import AppIcon from '../Icon/AppIcon';
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
  const name = conversation.patient_name?.trim() || 'Patient';
  const timeLabel = start.isValid() ? start.format('MMM D, h:mm A') : '';
  const reason = conversation.appointment?.reason ?? conversation.reason;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
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

      {reason ? (
        <View style={styles.reasonRow}>
          <AppIcon
            name="chatbubble-ellipses-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.reason} numberOfLines={2}>
            {reason}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
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
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  reason: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
});

export default RecentAppointmentCard;
