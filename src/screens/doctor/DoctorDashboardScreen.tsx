import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppointmentRequestCard,
  AppIcon,
  Avatar,
  RecentAppointmentCard,
  StatCard,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { DASHBOARD_STATS } from '../../context/appData';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { sessionService } from '../../services';
import { Conversation } from '../../types';
import { Colors, Radius, Spacing, responsiveSize } from '../../theme';

const DoctorDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Pending requests = conversations awaiting the doctor's decision.
  const pendingRequests = conversations.filter((c) => c.state === 'pending');

  const stats = useMemo(
    () => ({
      totalAssigned: conversations.length,
      awaitingAction: pendingRequests.length,
      activeSessions: conversations.filter(
        (c) => c.state === 'active' || c.state === 'in_progress'
      ).length,
      completedSessions: conversations.filter((c) => c.state === 'ended').length,
    }),
    [conversations, pendingRequests]
  );

  const recent = conversations.filter((c) => c.state !== 'pending');

  const filteredRecent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recent.filter((c) => {
      if (!q) return true;
      const name = (c.patient_name ?? '').toLowerCase();
      return name.includes(q) || String(c.patient_id).includes(q);
    });
  }, [recent, searchQuery]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const convs = await sessionService.getConversations();
      setConversations(convs);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Live real-time refresh whenever backend data changes over the socket.
  useAutoRefresh(refresh);

  const handleRequestAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await sessionService.updateConversationStatus(id, { status });
      Alert.alert(
        status === 'approved' ? 'Request Approved' : 'Request Rejected',
        status === 'approved'
          ? 'The session has been scheduled and the patient notified.'
          : 'The request has been rejected.'
      );
      await refresh();
    } catch (err) {
      Alert.alert(
        'Action Failed',
        err instanceof Error ? err.message : 'Could not update the request.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'Doctor'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <AppIcon name="notifications-outline" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Avatar name={user?.name || '?'} size={38} online />
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            {/* Statistics */}
            <View style={styles.statsGrid}>
              {DASHBOARD_STATS.map((config) => (
                <StatCard key={config.key} config={config} value={stats[config.key]} />
              ))}
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
              <AppIcon name="search-outline" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patients by name or ID"
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                keyboardAppearance="dark"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <AppIcon name="close-circle" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Appointment Requests */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Appointment Requests</Text>
              <Text style={styles.seeAll}>{pendingRequests.length} incoming</Text>
            </View>

            {pendingRequests.length === 0 ? (
              <Text style={styles.emptyText}>No incoming appointment requests.</Text>
            ) : (
              pendingRequests.map((req) => (
                <AppointmentRequestCard
                  key={req.id}
                  request={req}
                  onAccept={() => handleRequestAction(req.id, 'approved')}
                  onReject={() => handleRequestAction(req.id, 'rejected')}
                />
              ))
            )}

            {/* Recent Appointments */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Appointments</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Consultations')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {filteredRecent.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery ? 'No appointments match your search.' : 'No appointments yet.'}
              </Text>
            ) : (
              filteredRecent.map((c) => (
                <RecentAppointmentCard
                  key={c.id}
                  conversation={c}
                  onViewDetails={() => navigation.navigate('Consultations')}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 110,
  },
  center: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  greeting: {
    fontSize: responsiveSize(15),
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  name: {
    fontSize: responsiveSize(26),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 48,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: Spacing.md,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: responsiveSize(18),
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});

export default DoctorDashboardScreen;
