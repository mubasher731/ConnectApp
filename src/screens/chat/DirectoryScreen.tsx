import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ListItemSeparator, UserDirectoryCard } from '../../components';
import { socketService } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import { chatService, userService } from '../../services';
import { User } from '../../types';
import { Colors, Spacing } from '../../theme';

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
    <UserDirectoryCard
      user={item}
      starting={startingId === item.id}
      onStart={() => startConsultation(item)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={<ListItemSeparator />}
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={`No ${title.toLowerCase()} yet`}
            message={`${title} will appear here once they join ConnectApp.`}
          />
        }
      />
    </SafeAreaView>
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
});

export default DirectoryScreen;
