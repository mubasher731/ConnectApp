import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AuthScreenLayout, FormInput, PrimaryButton, useAlert } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { validators, FieldErrors } from '../../utils/validation';
import { Colors, Spacing } from '../../theme';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signIn } = useAuth();
  const { showAlert } = useAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const nextErrors: FieldErrors = {
      email: validators.email(email),
      password: validators.password(password),
    };
    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      await signIn({ email, password });
      // Success — navigator switches to the authenticated flow automatically.
    } catch (err) {
      showAlert({
        title: 'Sign In Failed',
        message:
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        actions: [{ text: 'OK' }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Sign In"
      subtitle="Welcome back! Sign in to continue managing your healthcare conversations."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <FormInput
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (errors.email) setErrors((e) => ({ ...e, email: null }));
        }}
        error={errors.email}
      />

      <FormInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Enter your password"
        secure
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (errors.password) setErrors((e) => ({ ...e, password: null }));
        }}
        error={errors.password}
        onSubmitEditing={handleSubmit}
        returnKeyType="go"
      />

      <TouchableOpacity
        style={styles.forgotRow}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      <PrimaryButton
        title="Sign In"
        onPress={handleSubmit}
        loading={loading}
        disabled={!email.trim() || !password}
        style={styles.submitButton}
      />
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  submitButton: {
    marginTop: Spacing.lg,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default LoginScreen;
