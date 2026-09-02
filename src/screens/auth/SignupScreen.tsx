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
import { Colors, Spacing, fs } from '../../theme';

interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signUp } = useAuth();
  const { showAlert } = useAlert();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: keyof FieldErrors) =>
    setErrors((e) => ({ ...e, [field]: null }));

  const handleSubmit = async () => {
    const nextErrors: FieldErrors = {
      firstName: validators.firstName(firstName),
      email: validators.email(email),
      password: validators.password(password),
      confirmPassword: validators.confirmPassword(confirmPassword, password),
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await signUp({
        name: firstName.trim(),
        email,
        password,
      });
      // Success — navigator switches to the authenticated flow automatically.
    } catch (err) {
      showAlert({
        title: 'Sign Up Failed',
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
      title="Create Account"
      subtitle="Set up your profile to start connecting with your care team."
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <FormInput
        label="Full name"
        icon="person-outline"
        placeholder="Jane Doe"
        autoCapitalize="words"
        textContentType="name"
        value={firstName}
        onChangeText={(t) => {
          setFirstName(t);
          clearError('firstName');
        }}
        error={errors.firstName}
      />

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
          clearError('email');
        }}
        error={errors.email}
      />

      <FormInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Minimum 8 characters"
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          clearError('password');
        }}
        error={errors.password}
      />

      <FormInput
        label="Confirm password"
        icon="shield-checkmark-outline"
        placeholder="Re-enter your password"
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={(t) => {
          setConfirmPassword(t);
          clearError('confirmPassword');
        }}
        error={errors.confirmPassword}
        onSubmitEditing={handleSubmit}
        returnKeyType="go"
      />

      <PrimaryButton
        title="Create Account"
        onPress={handleSubmit}
        loading={loading}
        disabled={
          !firstName.trim() ||
          !email.trim() ||
          !password ||
          !confirmPassword
        }
        style={styles.submitButton}
      />
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
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

export default SignupScreen;
