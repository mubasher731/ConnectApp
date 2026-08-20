import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookAppointmentModal, DoctorCard, EmptyState } from '../../components';
import { sessionService } from '../../services';
import { BookingDoctor, Conversation } from '../../types';
import { Colors, Spacing } from '../../theme';

/** Generate 30-minute "HH:MM" slots within an availability window. */
const buildSlots = (start: string, end: string): string[] => {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const fmt = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const out: string[] = [];
  for (let t = toMin(start); t < toMin(end); t += 30) out.push(fmt(t));
  return out;
};

const DoctorsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<BookingDoctor | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await sessionService.getAvailableDoctors();
      const today = new Date().getDay();
      const mapped: BookingDoctor[] = list.map((doc) => {
        const day =
          doc.availability.find((a) => a.day_of_week === today) ??
          doc.availability[0];
        return {
          id: doc.id,
          name: doc.full_name,
          specialty: doc.specialization,
          timeSlots: day ? buildSlots(day.start_time, day.end_time) : [],
        };
      });
      setDoctors(mapped);
    } catch {
      setError('Could not load doctors. Is the backend running?');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const openBooking = (doctor: BookingDoctor) => {
    setBookingDoctor(doctor);
    setModalVisible(true);
  };

  const handleBooked = (conversation: Conversation) => {
    setModalVisible(false);
    setBookingDoctor(null);
    navigation.navigate('ChatDetail', {
      chatId: conversation.id,
      participantName: bookingDoctor?.name ?? 'Doctor',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find the Right Care for You</Text>
        <Text style={styles.headerSub}>
          Choose a trusted healthcare professional and book your appointment with ease.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DoctorCard doctor={item} onBook={openBooking} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={error ? 'Unable to load doctors' : 'No doctors yet'}
              message={
                error ?? 'Doctors will appear here once they are available.'
              }
            />
          }
        />
      )}

      <BookAppointmentModal
        visible={modalVisible}
        doctor={bookingDoctor}
        onClose={() => {
          setModalVisible(false);
          setBookingDoctor(null);
        }}
        onBooked={handleBooked}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 16,
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
