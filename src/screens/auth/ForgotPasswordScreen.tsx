import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import AuthScreenLayout from '../../components/AuthScreenLayout';
import FormInput from '../../components/FormInput';
import PrimaryButton from '../../components/PrimaryButton';
import { authService } from '../../services/authService';
import { validators } from '../../utils/validation';
import { Spacing } from '../../theme';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const emailError = validators.email(email);
    setError(emailError);
    if (emailError) return;

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      Alert.alert(
        'Something went wrong',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title={sent ? 'Check Your Inbox' : 'Reset Password'}
      subtitle={
        sent
          ? `We've sent password reset instructions to ${email}.`
          : 'Enter the email linked to your account and we’ll send you a reset link.'
      }
      onBack={() => navigation.goBack()}
      footer={
        sent ? (
          <PrimaryButton title="Back to Sign In" onPress={() => navigation.goBack()} />
        ) : undefined
      }
    >
      {!sent && (
        <>
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
              setError(null);
            }}
            error={error}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />
          <PrimaryButton
            title="Send Reset Link"
            onPress={handleSubmit}
            loading={loading}
            disabled={!email.trim()}
            style={styles.submitButton}
          />
        </>
      )}
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  submitButton: {
    marginTop: Spacing.lg,
  },
});

export default ForgotPasswordScreen;
