import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Spacing } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthHeader from './AuthHeader';
import BrandLogo from './BrandLogo';

interface AuthScreenLayoutProps {
  /** Screen title shown in the header (aligned with the back arrow). */
  title: string;
  subtitle: string;
  /** Optional back action — shows a back arrow when provided. */
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Shared layout for all authentication screens (login, signup, forgot). */
const AuthScreenLayout: React.FC<AuthScreenLayoutProps> = ({
  title,
  subtitle,
  onBack,
  children,
  footer,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthHeader title={title} onBack={onBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Centered app branding */}
            <BrandLogo />

            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  form: {
    width: '100%',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
});

export default AuthScreenLayout;
