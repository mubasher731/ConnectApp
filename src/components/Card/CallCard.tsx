import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import { CALL_DIRECTION_META } from '../../context/appData';
import { CallLog } from '../../types';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

interface CallCardProps {
  call: CallLog;
  onPress?: () => void;
}

/** Single call-log entry: avatar, direction meta, duration, call action. */
const CallCard: React.FC<CallCardProps> = ({ call, onPress }) => {
  const meta = CALL_DIRECTION_META[call.direction];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <Avatar name={call.participantName} size={52} online={false} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {call.participantName}
        </Text>
        <View style={styles.details}>
          <AppIcon name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.directionText, { color: meta.color }]}>
            {meta.label}
          </Text>
          {call.duration ? (
            <Text style={styles.duration}>{call.duration}</Text>
          ) : null}
        </View>
        <Text style={styles.time}>{call.startedAt}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.callButton} activeOpacity={0.7}>
          <AppIcon
            name={call.type === 'video' ? 'videocam-outline' : 'call-outline'}
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: responsiveSize(16),
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  directionText: {
    fontSize: responsiveSize(13),
    fontWeight: '500',
    marginLeft: 4,
    marginRight: Spacing.sm,
  },
  duration: {
    fontSize: responsiveSize(13),
    color: Colors.textSecondary,
  },
  time: {
    fontSize: responsiveSize(12),
    color: Colors.textTertiary,
    marginTop: 1,
  },
  actions: {
    marginLeft: Spacing.sm,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallCard;
