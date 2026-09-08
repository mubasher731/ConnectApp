import { StyleSheet } from 'react-native';
import { Colors, Spacing, ms, responsiveSize } from '../../../theme';

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
