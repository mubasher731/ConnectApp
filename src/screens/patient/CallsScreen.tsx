import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallCard, EmptyState, ListItemSeparator } from '../../components';
import { callService } from '../../services/dataService';
import { CallLog } from '../../types';
import { Colors, Spacing, responsiveSize, ms } from '../../theme';

const CallsScreen: React.FC = () => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await callService.getCallHistory();
      setCalls(data);
    } catch {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the screen regains focus so a call that just ended shows up.
  useEffect(() => {
    if (isFocused) load(true);
  }, [isFocused, load]);

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
        onRefresh={() => load(true)}
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
    marginTop: ms(2),
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: ms(110),
    flexGrow: 1,
  },
});

export default CallsScreen;
