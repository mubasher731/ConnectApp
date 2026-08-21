import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, DoctorAppointmentCard, EmptyState } from '../../components';
import { CONSULTATION_FILTERS, ConsultationFilterKey } from '../../context/appData';
import { sessionService } from '../../services';
import { Conversation } from '../../types';
import { Colors, Radius, Spacing, responsiveSize } from '../../theme';

const DoctorConsultationsScreen: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<ConsultationFilterKey>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      // Pending requests belong on the Dashboard — never show them here.
      if (c.state === 'pending') return false;
      if (filter === 'active') {
        if (c.state !== 'active' && c.state !== 'in_progress') return false;
      } else if (filter === 'ended') {
        if (c.state !== 'ended') return false;
      }
      if (!q) return true;
      const name = (c.patient_name ?? '').toLowerCase();
      return name.includes(q) || String(c.patient_id).includes(q);
    });
  }, [conversations, filter, searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>My Consultations</Text>
          <Text style={styles.headerSub}>
            {conversations.filter((c) => c.state !== 'pending').length} total requests
          </Text>
        </View>
        <TouchableOpacity
          style={styles.searchIconButton}
          onPress={() => setSearchOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <AppIcon name="search-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Expandable search bar */}
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
              keyboardAppearance="dark"
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

      {/* Status filters */}
      <View style={styles.filterRow}>
        {CONSULTATION_FILTERS.map((f) => {
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DoctorAppointmentCard conversation={item} />}
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default DoctorConsultationsScreen;
