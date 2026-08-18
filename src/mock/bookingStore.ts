/**
 * In-memory mock store for appointment booking requests.
 * Shared by the Patient Portal (create) and Doctor Portal (review/accept/reject).
 * Data lives for the app session — swap with real API calls when the backend is ready.
 */

export type BookingStatus = 'pending' | 'accepted' | 'rejected';

export interface BookingRequest {
  id: string;
  doctorId: number;
  doctorName: string;
  patientName: string;
  timeSlot: string;
  message: string;
  status: BookingStatus;
  createdAt: string;
}

let requests: BookingRequest[] = [];
let nextId = 1;

const seed: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>[] = [
  {
    doctorId: 2,
    doctorName: 'Dr. Ahmad Khan',
    patientName: 'Jane Patient',
    timeSlot: '10:00 AM',
    message: 'I have been having chest pain since this morning.',
  },
  {
    doctorId: 2,
    doctorName: 'Dr. Ahmad Khan',
    patientName: 'Ali Raza',
    timeSlot: '11:00 AM',
    message: 'Need a follow-up on my last prescription.',
  },
];

requests = seed.map((r) => ({
  ...r,
  id: `REQ-${nextId++}`,
  status: 'pending' as BookingStatus,
  createdAt: new Date().toISOString(),
}));

export const bookingStore = {
  /** Create a new booking request (patient side). */
  create(input: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>): BookingRequest {
    const req: BookingRequest = {
      ...input,
      id: `REQ-${nextId++}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    requests = [req, ...requests];
    return req;
  },

  /** All requests. */
  list(): BookingRequest[] {
    return requests;
  },

  /** Requests for a specific doctor (doctor portal). */
  listForDoctor(doctorId: number): BookingRequest[] {
    return requests.filter((r) => r.doctorId === doctorId);
  },

  /** Accept / reject a request. */
  update(id: string, status: BookingStatus): void {
    requests = requests.map((r) => (r.id === id ? { ...r, status } : r));
  },
};
