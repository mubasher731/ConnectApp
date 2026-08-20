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
import { sessionService } from '../../services';
import { BookingDoctor, Conversation } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface BookAppointmentModalProps {
  visible: boolean;
  doctor: BookingDoctor | null;
  onClose: () => void;
  /** Called with the created conversation so the screen can open the chat. */
  onBooked?: (conversation: Conversation) => void;
}

/** "09:00" → "09:00 AM - 09:30 AM". */
const formatSlotDisplay = (slot: string): string => {
  const [h, m] = slot.split(':').map(Number);
  const fmt = (min: number) => {
    const hr = Math.floor(min / 60) % 24;
    const mn = min % 60;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const h12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${String(h12).padStart(2, '0')}:${String(mn).padStart(2, '0')} ${ampm}`;
  };
  const startMin = (h || 0) * 60 + (m || 0);
  return `${fmt(startMin)} - ${fmt(startMin + 30)}`;
};

/** Centered booking modal: doctor info, slot dropdown, message, send/cancel. */
const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  visible,
  doctor,
  onClose,
  onBooked,
}) => {
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);
  const [slotStatus, setSlotStatus] = useState<
    'idle' | 'checking' | 'available' | 'booked'
  >('idle');
  const [sending, setSending] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slotUnavailableAlert = () =>
    Alert.alert(
      'Slot Unavailable',
      '⚠️ This slot has already been booked. Please select a different time.'
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
    reset();
    onClose();
  };

  /** Select a slot → simulated 10-second availability check (server is source of truth). */
  const handleSelectSlot = (slot: string) => {
    if (!doctor) return;
    setTimeSlot(slot);
    setSlotDropdownOpen(false);
    setSlotStatus('checking');
    clearCheck();
    checkTimer.current = setTimeout(() => {
      // All listed slots come from the doctor's availability; the backend
      // re-validates on POST and returns 400 if the slot was just taken.
      setSlotStatus('available');
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

    // Backend requires the reason to be 3–5 words.
    const words = message.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3 || words.length > 5) {
      Alert.alert('Reason required', 'Please write a reason between 3 and 5 words.');
      return;
    }

    setSending(true);
    try {
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const conversation = await sessionService.createConversation({
        doctor_id: doctor.id,
        date,
        time_slot: timeSlot,
        reason: message.trim(),
      });

      Alert.alert(
        'Request Sent',
        'Your appointment request has been sent. The doctor will review it shortly.',
        [
          { text: 'Close', style: 'cancel', onPress: handleClose },
          {
            text: 'Open Chat',
            onPress: () => {
              handleClose();
              onBooked?.(conversation);
            },
          },
        ]
      );
    } catch {
      slotUnavailableAlert();
    } finally {
      setSending(false);
    }
  };

  const slots = doctor?.timeSlots ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Doctor info */}
          <View style={styles.header}>
            <Avatar name={doctor?.name ?? '?'} size={48} />
            <View style={styles.headerText}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {doctor?.name}
              </Text>
              <Text style={styles.doctorSpecialty} numberOfLines={1}>
                {doctor?.specialty ?? 'Doctor'}
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
                {timeSlot ? formatSlotDisplay(timeSlot) : 'Choose the session slot...'}
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
                  {slots.length === 0 ? (
                    <Text style={styles.noSlots}>No slots available today.</Text>
                  ) : (
                    slots.map((slot) => {
                      const selected = timeSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[styles.slotItem, selected && styles.slotItemActive]}
                          onPress={() => handleSelectSlot(slot)}
                          activeOpacity={0.6}
                        >
                          <Text
                            style={[
                              styles.slotItemText,
                              selected && styles.slotItemTextActive,
                            ]}
                          >
                            {formatSlotDisplay(slot)}
                          </Text>
                          {selected && (
                            <AppIcon name="checkmark" size={16} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
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
            <Text style={styles.label}>Reason (3–5 words)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="e.g. Need a follow-up consultation"
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
                disabled={sending}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.sendBtn,
                  (slotStatus !== 'available' || sending) && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={slotStatus !== 'available' || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.sendText}>Send Request</Text>
                )}
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
  noSlots: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
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
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default BookAppointmentModal;
