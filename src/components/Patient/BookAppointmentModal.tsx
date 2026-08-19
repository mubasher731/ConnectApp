import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import { DoctorProfile } from '../../mock/doctorProfiles';
import { bookingStore } from '../../mock/bookingStore';
import { TIME_SLOTS } from '../../mock/timeSlots';
import { mockSessionStore, MockSession } from '../../services/mockSessionStore';
import { mockNotificationCenter } from '../../services/mockNotificationCenter';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

/** Resolve the start of a "10:00am - 10:15am" slot as its next occurrence. */
const parseSlotStart = (slot: string, from = new Date()): Date => {
  const [start] = slot.split(' - ');
  const match = start.trim().match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return new Date(from.getTime() + 5 * 60_000);
  let hours = parseInt(match[1], 10) % 12;
  if (match[3].toLowerCase() === 'pm') hours += 12;
  const minutes = parseInt(match[2], 10);
  const candidate = new Date(from);
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate.getTime() <= from.getTime() + 60_000) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
};

interface BookAppointmentModalProps {
  visible: boolean;
  doctor: DoctorProfile | null;
  onClose: () => void;
  /** Called with the created mock session so the screen can open the chat. */
  onBooked?: (session: MockSession) => void;
}

/** Centered booking modal: doctor info, time-slot pills, message, send/cancel. */
const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  visible,
  doctor,
  onClose,
  onBooked,
}) => {
  const { user } = useAuth();
  const patientId = String(user?.id ?? 'guest-patient');
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);
  const [slotStatus, setSlotStatus] = useState<
    'idle' | 'checking' | 'available' | 'booked'
  >('idle');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slotUnavailableAlert = () =>
    Alert.alert(
      'Slot Unavailable',
      '⚠️ This slot has already been booked by another patient. Please select a different time.'
    );

  const clearCheck = () => {
    if (checkTimer.current) {
      clearTimeout(checkTimer.current);
      checkTimer.current = null;
    }
  };

  const reset = () => {
    clearCheck();
    setTimeSlot(null);
    setMessage('');
    setSlotDropdownOpen(false);
    setSlotStatus('idle');
  };

  const handleClose = () => {
    if (doctor && timeSlot && slotStatus === 'available') {
      bookingStore.releaseSlot(doctor.id, timeSlot, patientId);
    }
    reset();
    onClose();
  };

  /** Select a slot → simulated 10-second availability check. */
  const handleSelectSlot = (slot: string) => {
    if (!doctor) return;
    // Release any previously held slot before starting a fresh check.
    if (timeSlot && timeSlot !== slot) {
      bookingStore.releaseSlot(doctor.id, timeSlot, patientId);
    }
    setTimeSlot(slot);
    setSlotDropdownOpen(false);
    setSlotStatus('checking');
    clearCheck();
    checkTimer.current = setTimeout(() => {
      const booked = bookingStore.isSlotBooked(doctor.id, slot, patientId);
      if (booked) {
        setSlotStatus('booked');
      } else {
        bookingStore.reserveSlot(
          doctor.id,
          slot,
          patientId,
          user?.name || 'Patient'
        );
        setSlotStatus('available');
      }
      checkTimer.current = null;
    }, 10_000);
  };

  const handleSend = async () => {
    if (!doctor) return;
    if (!timeSlot) {
      Alert.alert('Select a time slot', 'Please choose an available time slot.');
      return;
    }
    if (slotStatus === 'checking') {
      Alert.alert('Still checking', 'Please wait while we verify availability.');
      return;
    }
    if (slotStatus !== 'available') {
      slotUnavailableAlert();
      return;
    }
    // Re-check before sending: the slot may have been taken while the modal was open.
    if (bookingStore.isSlotBooked(doctor.id, timeSlot, patientId)) {
      slotUnavailableAlert();
      return;
    }

    const patientName = user?.name || 'Patient';
    bookingStore.create({
      doctorId: doctor.id,
      doctorName: doctor.name,
      patientName,
      patientId: user?.id,
      timeSlot,
      message: message.trim() || 'No message provided',
    });
    bookingStore.releaseSlot(doctor.id, timeSlot, patientId);

    // Create an AsyncStorage-backed mock session scheduled at the chosen slot time.
    let session: MockSession | undefined;
    if (user) {
      session = await mockSessionStore.createSession({
        patientId: user.id,
        patientName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        scheduledStart: parseSlotStart(timeSlot).toISOString(),
        durationMinutes: 10,
      });
    }

    // Personalized notifications, stored per user_id + role.
    const doctorNameShort = doctor.name.replace(/^Dr\.\s*/, '');
    await mockNotificationCenter
      .add(
        'appointment',
        'Appointment Booked',
        `You booked appointment with Dr. ${doctorNameShort} at ${timeSlot}`,
        { userId: user?.id, role: 'patient' }
      )
      .catch(() => {});
    await mockNotificationCenter
      .add(
        'appointment',
        '📋 New Booking Request',
        `📋 New booking from ${patientName} at ${timeSlot}`,
        { userId: doctor.id, role: 'doctor' }
      )
      .catch(() => {});

    Alert.alert(
      'Request Sent',
      `Your appointment request to ${doctor.name} has been sent for ${timeSlot}. You'll be notified once the doctor confirms.`,
      session
        ? [
            { text: 'Close', style: 'cancel', onPress: handleClose },
            {
              text: 'Open Chat',
              onPress: () => {
                handleClose();
                onBooked?.(session);
              },
            },
          ]
        : [{ text: 'OK', onPress: handleClose }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Doctor info */}
          <View style={styles.header}>
            <Avatar name={doctor?.name ?? '?'} size={48} avatarUrl={doctor?.avatar} />
            <View style={styles.headerText}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {doctor?.name}
              </Text>
              <Text style={styles.doctorSpecialty} numberOfLines={1}>
                {doctor?.specialty}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {/* Time slot dropdown */}
            <Text style={styles.label}>Select Time Slot</Text>
            <TouchableOpacity
              style={styles.dropdownField}
              onPress={() => setSlotDropdownOpen((o) => !o)}
              activeOpacity={0.7}
            >
              <Text
                style={timeSlot ? styles.dropdownValue : styles.dropdownPlaceholder}
                numberOfLines={1}
              >
                {timeSlot ?? 'Choose the session slot...'}
              </Text>
              <AppIcon
                name={slotDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {slotDropdownOpen && (
              <View style={styles.slotList}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={styles.slotListScroll}
                >
                  {TIME_SLOTS.map((slot) => {
                    const status = doctor
                      ? bookingStore.getSlotStatus(doctor.id, slot, patientId)
                      : 'free';
                    const selected = timeSlot === slot;
                    const booked = status === 'booked';
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotItem,
                          selected && styles.slotItemActive,
                          booked && !selected && styles.slotItemBooked,
                        ]}
                        onPress={() => handleSelectSlot(slot)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.slotItemText,
                            selected && styles.slotItemTextActive,
                            booked && !selected && styles.slotItemTextBooked,
                          ]}
                        >
                          {slot}
                        </Text>
                        {booked && !selected && (
                          <Text style={styles.slotBookedTag}>Booked</Text>
                        )}
                        {selected && (
                          <AppIcon name="checkmark" size={16} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Slot availability status (10s check result) */}
            {slotStatus === 'checking' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.statusChecking}>Checking availability...</Text>
              </View>
            )}
            {slotStatus === 'available' && (
              <View style={styles.statusRow}>
                <AppIcon name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.statusAvailable}>Available</Text>
              </View>
            )}
            {slotStatus === 'booked' && (
              <View style={styles.statusRow}>
                <AppIcon name="close-circle" size={18} color={Colors.error} />
                <Text style={styles.statusBooked}>Already Booked</Text>
              </View>
            )}

            {/* Message */}
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="I am sick..."
              placeholderTextColor={Colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.sendBtn,
                  slotStatus !== 'available' && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={slotStatus !== 'available'}
              >
                <Text style={styles.sendText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.raised,
  },
  body: {
    flexGrow: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    height: 50,
    marginBottom: Spacing.sm,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: Colors.textTertiary,
    marginRight: Spacing.sm,
  },
  slotList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.raised,
  },
  slotListScroll: {
    maxHeight: 180,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  slotItemActive: {
    backgroundColor: Colors.primarySoft,
  },
  slotItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  slotItemTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  slotItemBooked: {
    opacity: 0.55,
  },
  slotItemTextBooked: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  slotBookedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  statusChecking: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  statusAvailable: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: Spacing.sm,
  },
  statusBooked: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  messageInput: {
    minHeight: 90,
    borderRadius: Radius.md,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  cancelBtn: {
    backgroundColor: Colors.inputBackground,
    marginRight: Spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
    ...Shadows.primary,
  },
  sendText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default BookAppointmentModal;
