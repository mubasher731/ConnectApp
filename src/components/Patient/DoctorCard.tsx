import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from '../Icon/Avatar';
import { DoctorProfile } from '../../mock/doctorProfiles';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface DoctorCardProps {
  doctor: DoctorProfile;
  onBook: (doctor: DoctorProfile) => void;
}

/** Doctor card: 60px circle avatar + name + specialty + Book Appointment button. */
const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook }) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <Avatar name={doctor.name} size={60} avatarUrl={doctor.avatar} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {doctor.name}
        </Text>
        <Text style={styles.specialty} numberOfLines={1}>
          {doctor.specialty}
        </Text>
        {doctor.fee ? <Text style={styles.fee}>Fee: Rs. {doctor.fee}</Text> : null}
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
  fee: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
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
