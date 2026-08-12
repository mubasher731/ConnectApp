import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppIcon, Avatar, EmptyState } from '../components';
import { socketService } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { chatService, userService } from '../services';
import { User } from '../types';
import { Colors, Radius, Shadows, Spacing } from '../theme';

interface DirectoryScreenProps {
  route: any;
  navigation: any;
}

/** Lists users by role — doctors (roleId 3) or patients (roleId 4). */
const DirectoryScreen: React.FC<DirectoryScreenProps> = ({ route, navigation }) => {
  const roleId: 3 | 4 = route.params?.roleId ?? 3;
  const title = route.params?.title ?? (roleId === 4 ? 'Patients' : 'Doctors');
  const { user } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | number | null>(null);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    let mounted = true;
    userService
      .getUsersByRole(roleId)
      .then((data) => mounted && setUsers(data))
      .catch(() => mounted && setUsers([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [roleId]);

  /** Open (or create) a consultation chat with the selected user. */
  const startConsultation = async (other: User) => {
    if (!user || startingId) return;
    setStartingId(other.id);
    try {
      const chat = await chatService.getOrCreateSessionWith(other);
      socketService.joinSession(chat.id);
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        participantName: chat.participantName,
      });
    } catch (err) {
      Alert.alert(
        'Unable to Start',
        err instanceof Error ? err.message : 'Could not start the consultation.'
      );
    } finally {
      setStartingId(null);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.item} activeOpacity={0.7}>
      <Avatar name={item.name} size={52} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {item.role_id === 3 ? 'Doctor' : 'Patient'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.consultButton}
          onPress={() => startConsultation(item)}
          disabled={startingId !== null}
          activeOpacity={0.8}
        >
          {startingId === item.id ? (
            <Text style={styles.consultButtonText}>…</Text>
          ) : (
            <AppIcon name="chatbubble-ellipses" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={`No ${title.toLowerCase()} yet`}
            message={`${title} will appear here once they join ConnectApp.`}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  item: {
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
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
    fontSize: 12,
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
  separator: {
    height: Spacing.sm,
  },
});

export default DirectoryScreen;
