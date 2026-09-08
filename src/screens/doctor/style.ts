import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, wp, ms, fs, responsiveSize } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: ms(110),
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
    width: wp(40),
    height: wp(40),
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
    marginTop: ms(2),
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
    height: wp(48),
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: fs(15),
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
    fontSize: fs(14),
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: fs(14),
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
