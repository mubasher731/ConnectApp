import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import AppIcon from '../AppIcon';
import Avatar from '../Avatar';
import { DoctorProfile } from '../../mock/doctorProfiles';
import { bookingStore } from '../../mock/bookingStore';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

const formatMinutes = (total: number) => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};

/** 15-minute interval session slots, e.g. "10:00am - 10:15am". */
const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let t = 9 * 60; t < 17 * 60; t += 15) {
    slots.push(`${formatMinutes(t)} - ${formatMinutes(t + 15)}`);
  }
  return slots;
})();

interface BookAppointmentModalProps {
  visible: boolean;
  doctor: DoctorProfile | null;
  onClose: () => void;
}

/** Centered booking modal: doctor info, time-slot pills, message, send/cancel. */
const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  visible,
  doctor,
  onClose,
}) => {
  const { user } = useAuth();
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);

  const reset = () => {
    setTimeSlot(null);
    setMessage('');
    setSlotDropdownOpen(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = () => {
    if (!doctor) return;
    if (!timeSlot) {
      Alert.alert('Select a time slot', 'Please choose an available time slot.');
      return;
    }
    bookingStore.create({
      doctorId: doctor.id,
      doctorName: doctor.name,
      patientName: user?.name || 'Patient',
      timeSlot,
      message: message.trim() || 'No message provided',
    });
    Alert.alert('Request Sent', `Your appointment request to ${doctor.name} has been sent.`);
    handleClose();
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
                    const selected = timeSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotItem, selected && styles.slotItemActive]}
                        onPress={() => {
                          setTimeSlot(slot);
                          setSlotDropdownOpen(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.slotItemText,
                            selected && styles.slotItemTextActive,
                          ]}
                        >
                          {slot}
                        </Text>
                        {selected && (
                          <AppIcon name="checkmark" size={16} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
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
                style={[styles.actionBtn, styles.sendBtn]}
                onPress={handleSend}
                activeOpacity={0.85}
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
