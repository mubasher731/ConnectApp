import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, Avatar, EmptyState } from '../../components';
import {
  MOCK_APPOINTMENTS,
  DoctorAppointment,
  APPOINTMENT_STATUS_META,
  URGENCY_META,
  SEVERITY_META,
} from '../../mock/doctorData';
import DoctorPill from './components/DoctorPill';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

type FilterKey = 'all' | 'in_progress' | 'completed' | 'closed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'all', label: 'All Requests' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Successfully closed' },
];

interface SeverityCard {
  key: 'mild' | 'moderate_severe' | 'severe';
  label: string;
  color: string;
  bg: string;
}

const SEVERITY_CARDS: SeverityCard[] = [
  { key: 'mild', label: 'Mild', color: '#22C55E', bg: '#E7F8EE' },
  { key: 'moderate_severe', label: 'Moderately Severe', color: '#F59E0B', bg: '#FEF3E0' },
  { key: 'severe', label: 'Severe', color: '#EF4444', bg: '#FDEAEA' },
];

const DoctorConsultationsScreen: React.FC<{ navigation: any }> = () => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const appointments = MOCK_APPOINTMENTS;

  const severityCounts = useMemo(
    () => ({
      mild: appointments.filter((a) => a.severity === 'mild').length,
      moderate_severe: appointments.filter((a) => a.severity === 'moderate_severe').length,
      severe: appointments.filter((a) => a.severity === 'severe').length,
    }),
    [appointments]
  );

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'in_progress') {
      return a.status === 'pending' || a.status === 'in_progress';
    }
    if (filter === 'completed') return a.status === 'completed';
    return a.status === 'closed';
  });

  const renderItem = ({ item }: { item: DoctorAppointment }) => {
    const status = APPOINTMENT_STATUS_META[item.status];
    const urgency = URGENCY_META[item.urgency];
    const severity = SEVERITY_META[item.severity];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <Avatar name={item.patientName} size={42} />
            <View style={styles.patientMeta}>
              <Text style={styles.patientName}>{item.patientName}</Text>
              <Text style={styles.patientId}>{item.patientId}</Text>
            </View>
          </View>
          <DoctorPill label={status.label} color={status.color} bg={status.bg} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <AppIcon name="calendar-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>Requested {item.requestedDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <AppIcon name="time-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
        </View>

        <View style={styles.pillRow}>
          <View style={styles.severityPill}>
            <View style={[styles.severityDot, { backgroundColor: severity.color }]} />
            <Text style={[styles.severityText, { color: severity.color }]}>
              {severity.label}
            </Text>
          </View>
          <DoctorPill label={urgency.label} color={urgency.color} bg={urgency.bg} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Consultations</Text>
        <Text style={styles.headerSub}>{appointments.length} total requests</Text>
      </View>

      {/* Severity distribution */}
      <View style={styles.severityRow}>
        {SEVERITY_CARDS.map((s) => (
          <View key={s.key} style={[styles.severityCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.severityCount, { color: s.color }]}>
              {severityCounts[s.key]}
            </Text>
            <Text style={styles.severityLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Status filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <AppIcon name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by patient name or ID"
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="No consultations"
            message="No patients match the current filter or search."
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
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  severityCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
  },
  severityCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  severityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 46,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: Spacing.md,
    paddingVertical: 0,
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: 110,
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: {
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
  patientId: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default DoctorConsultationsScreen;
