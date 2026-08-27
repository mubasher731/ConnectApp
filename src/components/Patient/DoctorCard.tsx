import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from '../Icon/AppIcon';
import Avatar from '../Icon/Avatar';
import { BookingDoctor } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format availability to a compact string like "Mon–Fri · 9:00 AM–5:00 PM". */
const formatAvailability = (availability: BookingDoctor['availability']): string => {
  if (!availability || availability.length === 0) return 'Not available';
  const days = availability.map((a) => DAY_NAMES[a.day_of_week]).join(', ');
  const first = availability[0];
  const [sh, sm] = (first.start_time || '09:00').split(':').map(Number);
  const [eh, em] = (first.end_time || '17:00').split(':').map(Number);
  const fmt = (h: number, m: number) => {
    const hr = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  return `${days} · ${fmt(sh, sm)}–${fmt(eh, em)}`;
};

interface DoctorCardProps {
  doctor: BookingDoctor;
  onBook: (doctor: BookingDoctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook }) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <Avatar name={doctor.name} size={60} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {doctor.name}
        </Text>
        <Text style={styles.specialty} numberOfLines={1}>
          {doctor.specialty ?? 'Doctor'}
        </Text>
        <View style={styles.availabilityRow}>
          <AppIcon name="time-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.availability} numberOfLines={1}>
            {formatAvailability(doctor.availability)}
          </Text>
        </View>
      </View>
    </View>

    <TouchableOpacity
      style={styles.bookButton}
      onPress={() => onBook(doctor)}
      activeOpacity={0.85}
    >
      <Text style={styles.bookText}>Book Appointment</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  specialty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  availability: {
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 1,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    ...Shadows.primary,
  },
  bookText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DoctorCard;
