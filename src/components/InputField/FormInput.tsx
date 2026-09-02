import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import AppIcon from '../Icon/AppIcon';
import { Colors, Radius, Spacing, wp, ms, fs } from '../../theme';

interface FormInputProps extends TextInputProps {
  label: string;
  icon: string;
  error?: string | null;
  secure?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  icon,
  error,
  secure = false,
  autoCapitalize = 'none',
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          hasError && styles.fieldError,
        ]}
      >
        <AppIcon
          name={icon}
          size={19}
          color={focused ? Colors.primary : Colors.textTertiary}
        />
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardAppearance="dark"
          {...rest}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.eyeButton}
          >
            <AppIcon
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      {hasError ? (
        <View style={styles.errorRow}>
          <AppIcon name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: fs(14),
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: wp(54),
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.inputBackground,
  },
  fieldError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorSoft,
  },
  input: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: fs(16),
    color: Colors.text,
    paddingVertical: 0,
  },
  eyeButton: {
    paddingLeft: Spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(6),
    marginLeft: Spacing.xs,
  },
  errorText: {
    fontSize: fs(12),
    color: Colors.error,
    marginLeft: ms(4),
    fontWeight: '500',
  },
});

export default FormInput;
