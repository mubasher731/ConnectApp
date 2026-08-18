import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, Avatar } from '../../components';
import { useAuth } from '../../context/AuthContext';
import {
  MOCK_APPOINTMENTS,
  APPOINTMENT_STATUS_META,
  URGENCY_META,
} from '../../mock/doctorData';
import { bookingStore, BookingRequest } from '../../mock/bookingStore';
import DoctorPill from '../../components/Doctor/DoctorPill';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

interface StatConfig {
  key: 'totalAssigned' | 'awaitingAction' | 'activeSessions' | 'completedSessions';
  label: string;
  icon: string;
  color: string;
  bg: string;
}

const STATS: StatConfig[] = [
  { key: 'totalAssigned', label: 'Total Assigned', icon: 'people-outline', color: Colors.primary, bg: Colors.primarySoft },
  { key: 'awaitingAction', label: 'Awaiting Action', icon: 'time-outline', color: '#F59E0B', bg: '#FEF3E0' },
  { key: 'activeSessions', label: 'Active Sessions', icon: 'pulse-outline', color: Colors.success, bg: Colors.successSoft },
  { key: 'completedSessions', label: 'Completed', icon: 'checkmark-done-outline', color: Colors.info, bg: '#E8F0FE' },
];

type UrgencyFilter = 'all' | 'high' | 'medium' | 'low';

const URGENCY_OPTIONS: { value: UrgencyFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Urgencies', color: Colors.textTertiary },
  { value: 'high', label: 'High', color: URGENCY_META.high.color },
  { value: 'medium', label: 'Medium', color: URGENCY_META.medium.color },
  { value: 'low', label: 'Low', color: URGENCY_META.low.color },
];

const StatCard: React.FC<{ config: StatConfig; value: number }> = ({ config, value }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: config.bg }]}>
      <AppIcon name={config.icon} size={20} color={config.color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{config.label}</Text>
  </View>
);

const DoctorDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const appointments = MOCK_APPOINTMENTS;
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Incoming appointment requests from patients (mock store).
  const [requests, setRequests] = useState<BookingRequest[]>(() =>
    bookingStore.listForDoctor(user?.id ?? 2)
  );
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const stats = useMemo(
    () => ({
      totalAssigned: appointments.length + requests.length,
      awaitingAction:
        appointments.filter((a) => a.status === 'pending').length +
        pendingRequests.length,
      activeSessions: appointments.filter((a) => a.status === 'in_progress').length,
      completedSessions: appointments.filter(
        (a) => a.status === 'completed' || a.status === 'closed'
      ).length,
    }),
    [appointments, requests, pendingRequests]
  );

  const filtered = appointments.filter(
    (a) =>
      (urgencyFilter === 'all' || a.urgency === urgencyFilter) &&
      (a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.patientId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const urgencyLabel =
    urgencyFilter === 'all'
      ? 'All Urgencies'
      : `${URGENCY_META[urgencyFilter].label} · ${
          appointments.filter((a) => a.urgency === urgencyFilter).length
        }`;

  const refreshRequests = useCallback(() => {
    setRequests(bookingStore.listForDoctor(user?.id ?? 2));
  }, [user?.id]);

  // Refresh incoming requests when the dashboard gains focus.
  useFocusEffect(
    useCallback(() => {
      refreshRequests();
    }, [refreshRequests])
  );

  const handleRequestAction = (id: string, status: 'accepted' | 'rejected') => {
    bookingStore.update(id, status);
    refreshRequests();
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
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <Avatar name={user?.name || '?'} size={38} online />
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsGrid}>
          {STATS.map((config) => (
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
          pendingRequests.map((req) => {
            const statusMeta = { label: 'Pending', color: '#F59E0B', bg: '#FEF3E0' };
            return (
              <View key={req.id} style={styles.appointmentCard}>
                <View style={styles.appointmentTop}>
                  <View style={styles.patientInfo}>
                    <Avatar name={req.patientName} size={40} />
                    <View style={styles.patientMeta}>
                      <Text style={styles.patientName}>{req.patientName}</Text>
                      <Text style={styles.patientSub}>Requested {req.timeSlot}</Text>
                    </View>
                  </View>
                  <DoctorPill
                    label={statusMeta.label}
                    color={statusMeta.color}
                    bg={statusMeta.bg}
                  />
                </View>

                <View style={styles.appointmentRow}>
                  <AppIcon
                    name="chatbubble-ellipses-outline"
                    size={14}
                    color={Colors.textTertiary}
                  />
                  <Text style={styles.appointmentMeta} numberOfLines={2}>
                    {req.message}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleRequestAction(req.id, 'accepted')}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="checkmark" size={16} color={Colors.white} />
                    <Text style={styles.actionText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleRequestAction(req.id, 'rejected')}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="close" size={16} color={Colors.white} />
                    <Text style={styles.actionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Recent Appointments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Consultations')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Urgency filter dropdown */}
        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              urgencyFilter !== 'all' && styles.dropdownButtonActive,
            ]}
            onPress={() => setDropdownOpen((o) => !o)}
            activeOpacity={0.7}
          >
            <AppIcon name="funnel-outline" size={16} color={Colors.primary} />
            <Text style={styles.dropdownLabel}>{urgencyLabel}</Text>
            <AppIcon
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {URGENCY_OPTIONS.map((option) => {
                const selected = urgencyFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setUrgencyFilter(option.value);
                      setDropdownOpen(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.urgencyDot, { backgroundColor: option.color }]} />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selected && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected && <AppIcon name="checkmark" size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No appointments match your search or filters.</Text>
        ) : (
          filtered.map((a) => {
            const status = APPOINTMENT_STATUS_META[a.status];
            const urgency = URGENCY_META[a.urgency];
            return (
              <View key={a.id} style={styles.appointmentCard}>
                <View style={styles.appointmentTop}>
                  <View style={styles.patientInfo}>
                    <Avatar name={a.patientName} size={40} />
                    <View style={styles.patientMeta}>
                      <Text style={styles.patientName}>{a.patientName}</Text>
                      <Text style={styles.patientSub}>
                        {a.patientId} · {a.date}
                      </Text>
                    </View>
                  </View>
                  <DoctorPill label={status.label} color={status.color} bg={status.bg} />
                </View>

                <View style={styles.appointmentRow}>
                  <AppIcon name="time-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.appointmentMeta}>{a.time}</Text>
                  <DoctorPill label={urgency.label} color={urgency.color} bg={urgency.bg} />
                </View>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => navigation.navigate('Consultations')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewText}>View Details</Text>
                </TouchableOpacity>
              </View>
            );
          })
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
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
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
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: responsiveSize(26),
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: responsiveSize(13),
    color: Colors.textSecondary,
    marginTop: 2,
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
  dropdownWrap: {
    marginBottom: Spacing.md,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    height: 48,
  },
  dropdownButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  dropdownLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  dropdownMenu: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.raised,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  dropdownItemTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  appointmentCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  appointmentTop: {
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
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
  },
  acceptBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.error,
    marginRight: 0,
  },
  actionText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
  viewBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  viewText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DoctorDashboardScreen;
