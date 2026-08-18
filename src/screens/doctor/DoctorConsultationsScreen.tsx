import React, { useState } from 'react';
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
import DoctorPill from '../../components/Doctor/DoctorPill';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

type FilterKey = 'all' | 'in_progress' | 'completed' | 'closed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'all', label: 'All Requests' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Successfully closed' },
];

type SeverityFilter = 'all' | 'mild' | 'moderate_severe' | 'severe';

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Severities', color: Colors.textTertiary },
  { value: 'mild', label: 'Mild', color: SEVERITY_META.mild.color },
  { value: 'moderate_severe', label: 'Moderately Severe', color: SEVERITY_META.moderate_severe.color },
  { value: 'severe', label: 'Severe', color: SEVERITY_META.severe.color },
];

const DoctorConsultationsScreen: React.FC<{ navigation: any }> = () => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [severityDropdownOpen, setSeverityDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const appointments = MOCK_APPOINTMENTS;

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (filter === 'all') return true;
    if (filter === 'in_progress') {
      return a.status === 'pending' || a.status === 'in_progress';
    }
    if (filter === 'completed') return a.status === 'completed';
    return a.status === 'closed';
  });

  const severityLabel =
    severityFilter === 'all' ? 'All Severities' : SEVERITY_META[severityFilter].label;

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
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>My Consultations</Text>
          <Text style={styles.headerSub}>{appointments.length} total requests</Text>
        </View>
        <TouchableOpacity
          style={styles.searchIconButton}
          onPress={() => setSearchOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <AppIcon name="search-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Expandable search bar (appears when the search icon is tapped) */}
      {searchOpen && (
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <AppIcon name="search-outline" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name or ID"
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AppIcon name="close-circle" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Severity filter dropdown */}
      <View style={styles.dropdownWrap}>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            severityFilter !== 'all' && styles.dropdownButtonActive,
          ]}
          onPress={() => setSeverityDropdownOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <AppIcon name="funnel-outline" size={16} color={Colors.primary} />
          <Text style={styles.dropdownLabel}>{severityLabel}</Text>
          <AppIcon
            name={severityDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {severityDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {SEVERITY_OPTIONS.map((option) => {
              const selected = severityFilter === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSeverityFilter(option.value);
                    setSeverityDropdownOpen(false);
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTextBlock: {
    flex: 1,
  },
  searchIconButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: responsiveSize(28),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: responsiveSize(14),
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dropdownWrap: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
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
    fontSize: responsiveSize(15),
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
    fontSize: responsiveSize(13),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 46,
  },
  cancelButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
