import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookAppointmentModal, DoctorCard, EmptyState } from '../../components';
import { MOCK_DOCTOR_PROFILES, DoctorProfile } from '../../mock/doctorProfiles';
import { Colors, Spacing } from '../../theme';

const DoctorsScreen: React.FC<{ navigation: any }> = () => {
  const [bookingDoctor, setBookingDoctor] = useState<DoctorProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openBooking = (doctor: DoctorProfile) => {
    setBookingDoctor(doctor);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Doctors</Text>
        <Text style={styles.headerSub}>Find a doctor and book an appointment</Text>
      </View>

      <FlatList
        data={MOCK_DOCTOR_PROFILES}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <DoctorCard doctor={item} onBook={openBooking} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No doctors yet"
            message="Doctors will appear here once they are available."
          />
        }
      />

      <BookAppointmentModal
        visible={modalVisible}
        doctor={bookingDoctor}
        onClose={() => {
          setModalVisible(false);
          setBookingDoctor(null);
        }}
      />
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
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
});

export default DoctorsScreen;
