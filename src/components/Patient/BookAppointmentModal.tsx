import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import Avatar from '../Avatar';
import { DoctorProfile } from '../../mock/doctorProfiles';
import { bookingStore } from '../../mock/bookingStore';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

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

  const reset = () => {
    setTimeSlot(null);
    setMessage('');
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

          {/* Time slots */}
          <Text style={styles.label}>Select Time Slot</Text>
          <View style={styles.slotRow}>
            {doctor?.timeSlots.map((slot) => {
              const selected = timeSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotChip, selected && styles.slotChipActive]}
                  onPress={() => setTimeSlot(slot)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.raised,
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
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  slotChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  slotTextActive: {
    color: Colors.white,
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
