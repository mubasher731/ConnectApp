/** Mock doctor directory for the Patient Portal (no backend yet). */

export interface DoctorProfile {
  id: number;
  name: string;
  specialty: string;
  avatar?: string | null;
  timeSlots: string[];
  fee?: number;
}

export const MOCK_DOCTOR_PROFILES: DoctorProfile[] = [
  {
    id: 2,
    name: 'Dr. Ahmad Khan',
    specialty: 'Cardiologist',
    avatar: null,
    timeSlots: ['10:00 AM', '10:15 AM', '10:30 AM', '11:00 AM'],
    fee: 2000,
  },
  {
    id: 3,
    name: 'Dr. Sara Ali',
    specialty: 'Dermatologist',
    avatar: null,
    timeSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '02:00 PM'],
    fee: 1500,
  },
  {
    id: 4,
    name: 'Dr. Usman Tariq',
    specialty: 'Neurologist',
    avatar: null,
    timeSlots: ['11:30 AM', '12:00 PM', '04:00 PM'],
    fee: 2500,
  },
  {
    id: 5,
    name: 'Dr. Maryam Shah',
    specialty: 'Pediatrician',
    avatar: null,
    timeSlots: ['08:30 AM', '09:00 AM', '01:00 PM', '03:30 PM'],
    fee: 1200,
  },
];
