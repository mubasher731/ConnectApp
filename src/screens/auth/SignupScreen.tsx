import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { AuthScreenLayout, FormInput, PrimaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { validators, FieldErrors } from '../../utils/validation';
import { Colors, Spacing } from '../../theme';

interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      lastName: validators.lastName(lastName),
      email: validators.email(email),
      password: validators.password(password),
      confirmPassword: validators.confirmPassword(confirmPassword, password),
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await signUp({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email,
        password,
      });
      // Success — navigator switches to the authenticated flow automatically.
    } catch (err) {
      Alert.alert(
        'Sign Up Failed',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
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
        label="First name"
        icon="person-outline"
        placeholder="Jane"
        autoCapitalize="words"
        textContentType="givenName"
        value={firstName}
        onChangeText={(t) => {
          setFirstName(t);
          clearError('firstName');
        }}
        error={errors.firstName}
      />

      <FormInput
        label="Last name"
        icon="person-outline"
        placeholder="Doe"
        autoCapitalize="words"
        textContentType="familyName"
        value={lastName}
        onChangeText={(t) => {
          setLastName(t);
          clearError('lastName');
        }}
        error={errors.lastName}
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
          !lastName.trim() ||
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
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default SignupScreen;
