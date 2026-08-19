import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
import { DASHBOARD_STATS, URGENCY_FILTER_OPTIONS, UrgencyFilter } from '../../context/appData';
import { MOCK_APPOINTMENTS, URGENCY_META } from '../../mock/doctorData';
import { bookingStore, BookingRequest } from '../../mock/bookingStore';
import { mockNotificationCenter } from '../../services/mockNotificationCenter';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

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

  const handleRequestAction = async (id: string, status: 'accepted' | 'rejected') => {
    const req = requests.find((r) => r.id === id);
    bookingStore.update(id, status);
    refreshRequests();
    if (!req || status !== 'accepted') return;

    // Meeting confirmed → both sides get a personalized notification.
    const doctorNameShort = req.doctorName.replace(/^Dr\.\s*/, '');
    await mockNotificationCenter
      .add(
        'appointment',
        '✅ Appointment Confirmed',
        `✅ Appointment confirmed with Dr. ${doctorNameShort} at ${req.timeSlot}`,
        { userId: req.patientId, role: 'patient' }
      )
      .catch(() => {});
    await mockNotificationCenter
      .add(
        'appointment',
        'Appointment Scheduled',
        `Appointment with ${req.patientName} at ${req.timeSlot}`,
        { userId: req.doctorId, role: 'doctor' }
      )
      .catch(() => {});

    Alert.alert(
      'Appointment Accepted',
      `Meeting scheduled with ${req.patientName} at ${req.timeSlot}. The patient has been notified.`
    );
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
              onAccept={() => handleRequestAction(req.id, 'accepted')}
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
              {URGENCY_FILTER_OPTIONS.map((option) => {
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
          filtered.map((a) => (
            <RecentAppointmentCard
              key={a.id}
              appointment={a}
              onViewDetails={() => navigation.navigate('Consultations')}
            />
          ))
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
});

export default DoctorDashboardScreen;
