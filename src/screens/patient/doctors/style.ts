import { StyleSheet } from 'react-native';
import { Colors, Spacing, ms, fs } from '../../../theme';

export const styles = StyleSheet.create({
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: fs(24),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: fs(16),
    color: Colors.textSecondary,
    marginTop: ms(2),
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
});
