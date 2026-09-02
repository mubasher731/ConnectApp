import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Spacing, fs } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthHeader from './Header/AuthHeader';
import BrandLogo from './Icon/BrandLogo';

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

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
      >
        <View style={styles.content}>
          {/* Centered app branding */}
          <BrandLogo />

          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.form}>{children}</View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAwareScrollView>
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
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  subtitle: {
    fontSize: fs(15),
    color: Colors.textSecondary,
    lineHeight: fs(22),
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  form: {
    width: '100%',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
});

export default AuthScreenLayout;
