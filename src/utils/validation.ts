/** Client-side validation rules for auth forms. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validators = {
  email(value: string): string | null {
    const v = value.trim();
    if (!v) return 'Email is required.';
    if (v.length > 254) return 'Email is too long.';
    if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
    return null;
  },

  password(value: string): string | null {
    if (!value) return 'Password is required.';
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (value.length > 64) return 'Password must be at most 64 characters.';
    return null;
  },

  firstName(value: string): string | null {
    const v = value.trim();
    if (!v) return 'First name is required.';
    if (v.length < 2) return 'First name must be at least 2 characters.';
    if (!/^[a-zA-Z\s'-]+$/.test(v)) return 'First name contains invalid characters.';
    return null;
  },

  lastName(value: string): string | null {
    const v = value.trim();
    if (!v) return 'Last name is required.';
    if (v.length < 2) return 'Last name must be at least 2 characters.';
    if (!/^[a-zA-Z\s'-]+$/.test(v)) return 'Last name contains invalid characters.';
    return null;
  },

  confirmPassword(value: string, password: string): string | null {
    if (!value) return 'Please confirm your password.';
    if (value !== password) return 'Passwords do not match.';
    return null;
  },
};

export type AuthField = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

export type FieldErrors = Partial<Record<AuthField, string | null>>;
