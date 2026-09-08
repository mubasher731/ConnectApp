import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, ms, responsiveSize } from '../../../theme';

export const styles = StyleSheet.create({
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
    fontSize: responsiveSize(28),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: responsiveSize(14),
    color: Colors.textSecondary,
    marginTop: ms(2),
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: ms(7),
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
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: ms(110),
    flexGrow: 1,
    backgroundColor: Colors.surface,
  },
});
