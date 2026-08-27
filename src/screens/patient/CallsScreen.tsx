import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallCard, EmptyState, ListItemSeparator } from '../../components';
import { callService } from '../../services/dataService';
import { CallLog } from '../../types';
import { Colors, Spacing, responsiveSize } from '../../theme';

const CallsScreen: React.FC = () => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    callService
      .getCallHistory()
      .then((data) => mounted && setCalls(data))
      .catch(() => mounted && setCalls([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const renderItem = ({ item }: { item: CallLog }) => <CallCard call={item} />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        {calls.length > 0 && (
          <Text style={styles.headerCount}>{calls.length} calls</Text>
        )}
      </View>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={<ListItemSeparator height={1} />}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          callService
            .getCallHistory()
            .then((data) => setCalls(data))
            .catch(() => setCalls([]))
            .finally(() => setLoading(false));
        }}
        ListEmptyComponent={
          <EmptyState
            icon="call-outline"
            title="No calls yet"
            message="Your voice and video call history will appear here after you connect with your care team."
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
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: responsiveSize(32),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: responsiveSize(14),
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 110,
    flexGrow: 1,
  },
});

export default CallsScreen;
