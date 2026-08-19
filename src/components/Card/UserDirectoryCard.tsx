import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import { User } from '../../types';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

interface UserDirectoryCardProps {
  user: User;
  onStart: () => void;
  starting: boolean;
}

/** Directory row: avatar, name/email, role badge and a start-chat action. */
const UserDirectoryCard: React.FC<UserDirectoryCardProps> = ({
  user,
  onStart,
  starting,
}) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.7}>
    <Avatar name={user.name} size={52} />
    <View style={styles.content}>
      <Text style={styles.name} numberOfLines={1}>
        {user.name}
      </Text>
      <Text style={styles.email} numberOfLines={1}>
        {user.email}
      </Text>
    </View>
    <View style={styles.actions}>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>
          {user.role_id === 3 ? 'Doctor' : 'Patient'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.consultButton}
        onPress={onStart}
        disabled={starting}
        activeOpacity={0.8}
      >
        {starting ? (
          <Text style={styles.consultButtonText}>…</Text>
        ) : (
          <AppIcon name="chatbubble-ellipses" size={18} color={Colors.white} />
        )}
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
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
    marginBottom: 2,
  },
  email: {
    fontSize: responsiveSize(13),
    color: Colors.textSecondary,
  },
  roleBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
  },
  roleText: {
    fontSize: responsiveSize(12),
    fontWeight: '600',
    color: Colors.primary,
  },
  actions: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  consultButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  consultButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default UserDirectoryCard;
