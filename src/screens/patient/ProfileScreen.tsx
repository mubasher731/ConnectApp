import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, Avatar, PrimaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { validators } from '../../utils/validation';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';
import { useTabBarClearance } from '../../utils/useResponsive';

const ProfileScreen: React.FC = () => {
  const { user, signOut, updateUser } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [errors, setErrors] = useState<{ fullName?: string | null; email?: string | null }>({});
  const [saving, setSaving] = useState(false);
  const bottomPad = useTabBarClearance();

  const displayName = user?.name ?? 'User';

  const handleSave = async () => {
    if (!user) return;

    const nextErrors = {
      fullName: validators.firstName(fullName),
      email: validators.email(email),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    try {
      await updateUser({ name: fullName.trim(), email: email.trim().toLowerCase() });
      setShowEditModal(false);
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err instanceof Error ? err.message : 'Unable to save your profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ConnectApp?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar name={displayName} size={88} />
            <TouchableOpacity style={styles.editAvatarButton} activeOpacity={0.8}>
              <AppIcon name="camera" size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <View style={styles.roleBadge}>
            <AppIcon name="medkit-outline" size={13} color={Colors.primary} />
            <Text style={styles.roleText}>
              {user?.role_id === 3 ? 'Doctor' : 'Patient'}
            </Text>
          </View>

          <PrimaryButton
            title="Edit Profile"
            variant="outline"
            onPress={() => {
              setFullName(user?.name ?? '');
              setEmail(user?.email ?? '');
              setErrors({});
              setShowEditModal(true);
            }}
            style={styles.editButton}
          />
        </View>

        {/* Account summary */}
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <AppIcon name="mail-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.accountText} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
          <View style={styles.accountDivider} />
          <View style={styles.accountRow}>
            <AppIcon name="calendar-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.accountText}>
              Member since {user?.created_at ? user.created_at.slice(0, 10) : '—'}
            </Text>
          </View>
        </View>
        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <AppIcon name="log-out-outline" size={18} color={Colors.white} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>ConnectApp v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Healthcare Communication Platform</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.modalLabel}>Full name</Text>
            <TextInput
              style={styles.modalInput}
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setErrors((e) => ({ ...e, fullName: null }));
              }}
              placeholder="Full name"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
            />
            {errors.fullName ? <Text style={styles.modalError}>{errors.fullName}</Text> : null}

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors((e) => ({ ...e, email: null }));
              }}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email ? <Text style={styles.modalError}>{errors.email}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, saving && styles.modalSaveDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: responsiveSize(28),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  scroll: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileName: {
    fontSize: responsiveSize(24),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: Spacing.lg,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  editButton: {
    paddingHorizontal: Spacing.xxl,
    minHeight: 46,
  },
  accountCard: {
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  accountDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  appInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  logoutButton: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.error,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.raised,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    paddingHorizontal: Spacing.xl,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    ...Shadows.raised,
  },
  modalTitle: {
    fontSize: responsiveSize(20),
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default ProfileScreen;
