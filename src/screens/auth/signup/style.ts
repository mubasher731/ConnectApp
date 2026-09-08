import { StyleSheet } from 'react-native';
import { Colors, Spacing, fs } from '../../../theme';

export const styles = StyleSheet.create({
  submitButton: {
    marginTop: Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fs(14),
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: fs(14),
    fontWeight: '700',
    color: Colors.primary,
  },
});
