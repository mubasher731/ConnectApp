import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import DoctorPill from '../Doctor/DoctorPill';
import { CONVERSATION_STATE_META } from '../../context/appData';
import { Conversation } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface DoctorAppointmentCardProps {
  conversation: Conversation;
}

/** Conversation card for the doctor's consultations list. */
const DoctorAppointmentCard: React.FC<DoctorAppointmentCardProps> = ({
  conversation,
}) => {
  const meta = CONVERSATION_STATE_META[conversation.state];
  const start = dayjs(conversation.scheduled_start);
  const end = dayjs(conversation.scheduled_end);
  const name = conversation.patient_name?.trim() || 'Patient';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Avatar name={name} size={42} />
          <View style={styles.patientMeta}>
            <Text style={styles.patientName} numberOfLines={1}>
              {name}
            </Text>
          </View>
        </View>
        <DoctorPill label={meta.label} color={meta.color} bg={meta.bg} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <AppIcon name="calendar-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>
            {start.isValid() ? start.format('MMM D, YYYY') : ''}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <AppIcon name="time-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>
            {start.isValid() ? `${start.format('h:mm A')} - ${end.format('h:mm A')}` : ''}
          </Text>
        </View>
      </View>

      {conversation.appointment?.reason ? (
        <Text style={styles.reason} numberOfLines={2}>
          {conversation.appointment.reason}
        </Text>
      ) : null}
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
  reason: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});

export default DoctorAppointmentCard;
