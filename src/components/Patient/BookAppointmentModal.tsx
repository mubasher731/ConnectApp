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
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [dateOpen, setDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Full month grid for the calendar (leading nulls fill the first weekday).
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calendarMonth]);

  const selectedDateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const calendarMonthLabel = calendarMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const selectCalendarDate = (day: Date) => {
    setSelectedDate(day);
    setTimeSlot(null);
    setDateOpen(false);
  };

  const reset = () => {
    setTimeSlot(null);
    setMessage('');
    setSlotOpen(false);
    setDateOpen(false);
  };

  // Fresh state every time the modal opens.
  useEffect(() => {
    if (visible) {
      setTimeSlot(null);
      setMessage('');
      setSelectedDate(new Date());
      setSlotOpen(false);
      setDateOpen(false);
      setCalendarMonth(new Date());
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

          <KeyboardAwareScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={20}
          >
            {/* Date selector */}
            <Text style={styles.label}>Select Date</Text>
            <TouchableOpacity
              style={[styles.slotDropdown, dateOpen && styles.slotDropdownOpen]}
              onPress={() => setDateOpen((o) => !o)}
              activeOpacity={0.85}
            >
              <Text style={[styles.slotDropdownText, styles.dateDropdownText]} numberOfLines={1}>
                {selectedDateLabel}
              </Text>
              <AppIcon name="calendar-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            {dateOpen && (
              <View style={styles.calendarCard}>
                {/* Month navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNav}
                    onPress={() =>
                      setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                    }
                    activeOpacity={0.7}
                  >
                    <AppIcon name="chevron-back" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthLabel}>{calendarMonthLabel}</Text>
                  <TouchableOpacity
                    style={styles.calendarNav}
                    onPress={() =>
                      setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                    }
                    activeOpacity={0.7}
                  >
                    <AppIcon name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Weekday header */}
                <View style={styles.calendarWeekRow}>
                  {WEEKDAYS.map((d) => (
                    <Text key={d} style={styles.calendarWeekday}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Day grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, i) => {
                    if (!day) {
                      return <View key={`empty-${i}`} style={styles.calendarDayCell} />;
                    }
                    const isPast = day < todayStart;
                    const isSelected = selectedDate.toDateString() === day.toDateString();
                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          isSelected && styles.calendarDaySelected,
                          isPast && styles.calendarDayDisabled,
                        ]}
                        disabled={isPast}
                        onPress={() => selectCalendarDate(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isPast && styles.calendarDayTextDisabled,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

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
          </KeyboardAwareScrollView>
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
  dateDropdownText: {
    marginLeft: 0,
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  calendarNav: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  calendarWeekday: {
    // Same fixed column width as the day cells so dates align exactly
    // under their weekday label.
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    // Fixed width (1/7th) keeps every day aligned to its weekday column —
    // including the last (partial) row, which flexGrow would stretch out.
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    // Compact circular highlight, perfectly centered inside the cell.
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  calendarDayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  calendarDayTextDisabled: {
    color: Colors.textTertiary,
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
