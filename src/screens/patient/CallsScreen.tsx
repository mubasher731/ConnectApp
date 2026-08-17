import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, Avatar, EmptyState } from '../../components';
import { callService } from '../../services/dataService';
import { CallLog, CallDirection } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

const directionMeta: Record<CallDirection, { icon: string; label: string; color: string }> = {
  incoming: { icon: 'arrow-down', label: 'Incoming', color: Colors.success },
  outgoing: { icon: 'arrow-up', label: 'Outgoing', color: Colors.primary },
  missed: { icon: 'close', label: 'Missed', color: Colors.error },
};

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

  const renderItem = ({ item }: { item: CallLog }) => {
    const meta = directionMeta[item.direction];

    return (
      <TouchableOpacity style={styles.callItem} activeOpacity={0.7}>
        <Avatar
          name={item.participantName}
          size={52}
          online={false}
        />
        <View style={styles.callContent}>
          <Text style={styles.callName} numberOfLines={1}>
            {item.participantName}
          </Text>
          <View style={styles.callDetails}>
            <AppIcon name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.directionText, { color: meta.color }]}>
              {meta.label}
            </Text>
            {item.duration ? (
              <Text style={styles.callDuration}>{item.duration}</Text>
            ) : null}
          </View>
          <Text style={styles.callTime}>{item.startedAt}</Text>
        </View>
        <View style={styles.callActions}>
          <TouchableOpacity
            style={styles.callButton}
            activeOpacity={0.7}
          >
            <AppIcon
              name={item.type === 'video' ? 'videocam-outline' : 'call-outline'}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
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
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 110,
    flexGrow: 1,
  },
  callItem: {
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
  callContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  directionText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    marginRight: Spacing.sm,
  },
  callDuration: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  callTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  callActions: {
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
  separator: {
    height: 1,
  },
});

export default CallsScreen;
