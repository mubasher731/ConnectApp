/**
 * Mock data for the Doctor module (until the backend is ready).
 * Structure mirrors what the doctor portal endpoints will return later.
 */

export type Urgency = 'low' | 'medium' | 'high';
export type Severity = 'mild' | 'moderate_severe' | 'severe';
export type AppointmentStatus =
  | 'pending'
  | 'in_progress'
  | 'accepted'
  | 'completed'
  | 'closed'
  | 'rejected';

export interface DoctorAppointment {
  id: string;
  patientName: string;
  patientId: string;
  date: string; // "Jul 25, 2026"
  time: string; // "10:30 AM"
  requestedDate: string;
  urgency: Urgency;
  severity: Severity;
  status: AppointmentStatus;
}

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3E0' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bg: '#E8F0FE' },
  accepted: { label: 'Accepted', color: '#5B67F1', bg: '#EEF0FE' },
  completed: { label: 'Completed', color: '#22C55E', bg: '#E7F8EE' },
  closed: { label: 'Closed', color: '#6B7280', bg: '#F1F2F6' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FDEAEA' },
};

export const URGENCY_META: Record<Urgency, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#22C55E', bg: '#E7F8EE' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FEF3E0' },
  high: { label: 'High', color: '#EF4444', bg: '#FDEAEA' },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string }> = {
  mild: { label: 'Mild', color: '#22C55E', bg: '#E7F8EE' },
  moderate_severe: { label: 'Moderately Severe', color: '#F59E0B', bg: '#FEF3E0' },
  severe: { label: 'Severe', color: '#EF4444', bg: '#FDEAEA' },
};

export const MOCK_APPOINTMENTS: DoctorAppointment[] = [
  { id: 'APT-1047', patientName: 'Sania Umer', patientId: 'P-1024', date: 'Jul 25, 2026', time: '10:30 AM', requestedDate: 'Jul 22, 2026', urgency: 'high', severity: 'severe', status: 'pending' },
  { id: 'APT-1046', patientName: 'Syeda Anum Fatima', patientId: 'P-1031', date: 'Jul 25, 2026', time: '11:00 AM', requestedDate: 'Jul 21, 2026', urgency: 'high', severity: 'moderate_severe', status: 'in_progress' },
  { id: 'APT-1045', patientName: 'Ali Raza', patientId: 'P-1002', date: 'Jul 24, 2026', time: '09:15 AM', requestedDate: 'Jul 19, 2026', urgency: 'medium', severity: 'mild', status: 'completed' },
  { id: 'APT-1044', patientName: 'Ayesha Khan', patientId: 'P-1050', date: 'Jul 24, 2026', time: '02:45 PM', requestedDate: 'Jul 18, 2026', urgency: 'low', severity: 'mild', status: 'closed' },
  { id: 'APT-1043', patientName: 'Bilal Ahmed', patientId: 'P-1008', date: 'Jul 24, 2026', time: '12:00 PM', requestedDate: 'Jul 20, 2026', urgency: 'medium', severity: 'moderate_severe', status: 'pending' },
  { id: 'APT-1042', patientName: 'Fatima Noor', patientId: 'P-1066', date: 'Jul 23, 2026', time: '04:00 PM', requestedDate: 'Jul 17, 2026', urgency: 'high', severity: 'severe', status: 'accepted' },
  { id: 'APT-1041', patientName: 'Hassan Ali', patientId: 'P-1015', date: 'Jul 23, 2026', time: '08:30 AM', requestedDate: 'Jul 16, 2026', urgency: 'low', severity: 'mild', status: 'completed' },
  { id: 'APT-1040', patientName: 'Mariam Shah', patientId: 'P-1077', date: 'Jul 22, 2026', time: '01:15 PM', requestedDate: 'Jul 15, 2026', urgency: 'medium', severity: 'moderate_severe', status: 'rejected' },
  { id: 'APT-1039', patientName: 'Usman Tariq', patientId: 'P-1089', date: 'Jul 22, 2026', time: '03:30 PM', requestedDate: 'Jul 14, 2026', urgency: 'high', severity: 'severe', status: 'closed' },
];
