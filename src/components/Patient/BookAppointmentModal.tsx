import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import { useAlert } from '../CustomAlert/AlertProvider';
import { sessionService } from '../../services';
import { BookingDoctor } from '../../types';
import {
  dateKey,
  daySlotsFor,
  isPastSlot,
  SESSION_DURATION_MINUTES,
} from '../../utils/slots';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface BookAppointmentModalProps {
  visible: boolean;
  doctor: BookingDoctor | null;
  onClose: () => void;
}

/** "09:00" → "09:00 AM – 09:15 AM" (slot start and end). */
const formatSlotRange = (slot: string): string => {
  const [h, m] = slot.split(':').map(Number);
  const fmt = (min: number) => {
    const hr = Math.floor(min / 60) % 24;
    const mn = min % 60;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const h12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${String(h12).padStart(2, '0')}:${String(mn).padStart(2, '0')} ${ampm}`;
  };
  const startMin = (h || 0) * 60 + (m || 0);
  return `${fmt(startMin)} – ${fmt(startMin + SESSION_DURATION_MINUTES)}`;
};

/** Centered booking modal: doctor info, slot dropdown, message, send/cancel. */
const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  visible,
  doctor,
  onClose,
}) => {
  const { showAlert } = useAlert();
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [slotOpen, setSlotOpen] = useState(false);

  // Next 7 days for the date selector.
  const dayOptions = useMemo(() => {
    const opts: { date: Date; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label =
        i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
      opts.push({ date: d, label: `${label} ${d.getDate()}` });
    }
    return opts;
  }, []);

  const reset = () => {
    setTimeSlot(null);
    setMessage('');
    setSlotOpen(false);
  };

  // Fresh state every time the modal opens.
  useEffect(() => {
    if (visible) {
      setTimeSlot(null);
      setMessage('');
      setSelectedDate(new Date());
      setSlotOpen(false);
    }
  }, [visible]);

  const handleClose = () => {
    reset();
    onClose();
  };

  /** Select a slot. The server is the source of truth — it validates on POST. */
  const handleSelectSlot = (slot: string) => {
    if (!doctor) return;
    setTimeSlot(slot);
  };

  const handleSend = async () => {
    if (!doctor) return;
    if (!timeSlot) {
      showAlert({
        title: 'Select a time slot',
        message: 'Please choose an available time slot.',
        actions: [{ text: 'OK' }],
      });
      return;
    }

    // Backend requires the reason to be 3–5 words.
    const words = message.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3 || words.length > 5) {
      showAlert({
        title: 'Reason required',
        message: 'Please write a reason between 3 and 5 words.',
        actions: [{ text: 'OK' }],
      });
      return;
    }

    setSending(true);
    try {
      const date = dateKey(selectedDate); // YYYY-MM-DD of the selected day
      await sessionService.createConversation({
        doctor_id: doctor.id,
        date,
        time_slot: timeSlot,
        reason: message.trim(),
      });

      showAlert({
        title: 'Request Sent',
        message:
          'Your appointment request has been sent. The doctor will review it shortly.',
        actions: [{ text: 'Close', style: 'cancel', onPress: handleClose }],
      });
    } catch (err) {
      // Surface the real backend error (e.g. slot outside availability,
      // duplicate pending request) instead of a misleading generic message.
      showAlert({
        title: 'Booking Failed',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Unable to book this slot. Please try again.',
        actions: [{ text: 'OK', style: 'destructive' }],
      });
    } finally {
      setSending(false);
    }
  };

  const allSlots = doctor ? daySlotsFor(doctor.availability, selectedDate) : [];
  const isSlotPast = (slot: string) => isPastSlot(slot, selectedDate);

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
            {/* Date selector */}
            <Text style={styles.label}>Select Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
            >
              {dayOptions.map((opt) => {
                const active = selectedDate.toDateString() === opt.date.toDateString();
                return (
                  <TouchableOpacity
                    key={opt.date.toISOString()}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => {
                      setSelectedDate(opt.date);
                      setTimeSlot(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time slot dropdown */}
            <Text style={styles.label}>Select Time Slot</Text>
            <TouchableOpacity
              style={[styles.slotDropdown, slotOpen && styles.slotDropdownOpen]}
              onPress={() => setSlotOpen((o) => !o)}
              activeOpacity={0.85}
            >
              <AppIcon name="time-outline" size={18} color={Colors.textSecondary} />
              <Text
                style={[
                  styles.slotDropdownText,
                  !timeSlot && styles.slotDropdownPlaceholder,
                ]}
                numberOfLines={1}
              >
                {timeSlot ? formatSlotRange(timeSlot) : 'Choose a Slot'}
              </Text>
              <AppIcon
                name={slotOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {slotOpen && (
              <ScrollView
                style={styles.slotList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {allSlots.length === 0 ? (
                  <Text style={styles.noSlots}>No slots available on this day.</Text>
                ) : (
                  allSlots.map((slot) => {
                    const disabled = isSlotPast(slot);
                    const selected = timeSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotRow,
                          selected && styles.slotRowSelected,
                          disabled && styles.slotRowDisabled,
                        ]}
                        disabled={disabled}
                        onPress={() => {
                          handleSelectSlot(slot);
                          setSlotOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <AppIcon
                          name={
                            disabled
                              ? 'lock-closed-outline'
                              : selected
                              ? 'checkmark-circle'
                              : 'checkmark-circle-outline'
                          }
                          size={18}
                          color={
                            disabled
                              ? Colors.textTertiary
                              : selected
                              ? Colors.primary
                              : Colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.slotRowText,
                            selected && styles.slotRowTextSelected,
                            disabled && styles.slotRowTextDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {formatSlotRange(slot)}
                        </Text>
                        {disabled ? (
                          <Text style={styles.slotRowTag}>N/A</Text>
                        ) : selected ? (
                          <Text style={styles.slotRowTagSelected}>Selected</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Slot status */}
            {timeSlot && (
              <View style={styles.statusRow}>
                <AppIcon name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.statusAvailable}>Available</Text>
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
              keyboardAppearance="dark"
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
                  (!timeSlot || sending) && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={!timeSlot || sending}
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
    backgroundColor: Colors.card,
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
  slotDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  slotDropdownOpen: {
    borderColor: Colors.primary,
  },
  slotDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.sm,
  },
  slotDropdownPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  slotList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    maxHeight: 280,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  slotRowSelected: {
    backgroundColor: Colors.primarySoft,
  },
  slotRowDisabled: {
    opacity: 0.55,
  },
  slotRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  slotRowTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  slotRowTextDisabled: {
    color: Colors.textTertiary,
  },
  slotRowTag: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.error,
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  slotRowTagSelected: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: 'rgba(124,134,255,0.16)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  dayRow: {
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  dayChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dayChipTextActive: {
    color: Colors.white,
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
    borderWidth: 1,
    borderColor: Colors.border,
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
