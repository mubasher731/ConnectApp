/**
 * In-memory mock store for appointment booking requests.
 * Shared by the Patient Portal (create) and Doctor Portal (review/accept/reject).
 *
 * Includes a simulated "real-time" slot lock: when a patient selects a time slot it is
 * held (booked) for 60 seconds. If another patient tries to grab the same slot during
 * that window (or the slot already has a confirmed request), the attempt is rejected.
 */

import { TIME_SLOTS } from './timeSlots';

export type BookingStatus = 'pending' | 'accepted' | 'rejected';

export interface BookingRequest {
  id: string;
  doctorId: number;
  doctorName: string;
  patientName: string;
  /** Patient user id — used to target confirmation notifications. */
  patientId?: number;
  timeSlot: string;
  message: string;
  status: BookingStatus;
  createdAt: string;
}

/** How long a freshly-selected time slot is held before it frees up (ms). */
export const SLOT_LOCK_MS = 60_000;

export type SlotStatus = 'booked' | 'held-by-me' | 'free';

export interface ReserveResult {
  ok: boolean;
  status: SlotStatus;
}

interface SlotLock {
  patientId: string;
  patientName: string;
  expiresAt: number;
}

let requests: BookingRequest[] = [];
let nextId = 1;

/** Active 60s reservations keyed by `${doctorId}|${slot}`. */
const slotLocks = new Map<string, SlotLock>();

const seed: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>[] = [
  {
    doctorId: 2,
    doctorName: 'Dr. Ahmad Khan',
    patientName: 'Jane Patient',
    timeSlot: '10:00am - 10:15am',
    message: 'I have been having chest pain since this morning.',
  },
  {
    doctorId: 2,
    doctorName: 'Dr. Ahmad Khan',
    patientName: 'Ali Raza',
    timeSlot: '11:00am - 11:15am',
    message: 'Need a follow-up on my last prescription.',
  },
  {
    doctorId: 3,
    doctorName: 'Dr. Sara Ali',
    patientName: 'Hina Khan',
    timeSlot: '09:00am - 09:15am',
    message: 'Skin rash for a week now.',
  },
  {
    doctorId: 4,
    doctorName: 'Dr. Usman Tariq',
    patientName: 'Bilal Ahmed',
    timeSlot: '04:00pm - 04:15pm',
    message: 'Frequent headaches in the evening.',
  },
];

requests = seed.map((r) => ({
  ...r,
  id: `REQ-${nextId++}`,
  status: 'pending' as BookingStatus,
  createdAt: new Date().toISOString(),
}));

/* ---------------------------------- helpers ---------------------------------- */

const lockKey = (doctorId: number, slot: string): string => `${doctorId}|${slot}`;

const pruneLocks = (): void => {
  const now = Date.now();
  slotLocks.forEach((lock, key) => {
    if (lock.expiresAt <= now) slotLocks.delete(key);
  });
};

/** A slot is permanently taken if it has an active (pending/accepted) request. */
const hasRequestForSlot = (doctorId: number, slot: string): boolean =>
  requests.some(
    (r) => r.doctorId === doctorId && r.timeSlot === slot && r.status !== 'rejected'
  );

const getActiveLock = (doctorId: number, slot: string): SlotLock | undefined => {
  const key = lockKey(doctorId, slot);
  const lock = slotLocks.get(key);
  if (!lock) return undefined;
  if (lock.expiresAt <= Date.now()) {
    slotLocks.delete(key);
    return undefined;
  }
  return lock;
};

/** Resolve a slot's availability for a given patient. */
const resolveSlotStatus = (doctorId: number, slot: string, patientId: string): SlotStatus => {
  pruneLocks();
  if (hasRequestForSlot(doctorId, slot)) return 'booked';
  const lock = getActiveLock(doctorId, slot);
  if (lock) return lock.patientId === patientId ? 'held-by-me' : 'booked';
  return 'free';
};

/* ------------------------------ other-patient sim ----------------------------- */

/**
 * Lightweight live simulation: every ~20s an "other patient" grabs one free slot for
 * 60 seconds, so the real-time booking check is observable on a single device.
 * Disabled under test so Jest exits cleanly.
 */
const SIM_INTERVAL_MS = 20_000;
const SIM_MAX_HOLDS = 3;
const SIM_PATIENT = { id: 'other-patient', name: 'Another Patient' };
const SIM_DOCTOR_IDS = [2, 3, 4, 5];

let simTimer: ReturnType<typeof setInterval> | null = null;

/** Minimal ambient type so the test-env guard compiles without @types/node. */
declare const process: { env: { NODE_ENV?: string } } | undefined;

const isTestEnv = (): boolean => process?.env?.NODE_ENV === 'test';

export function startOtherPatientSimulation(): void {
  if (simTimer || isTestEnv()) return;
  simTimer = setInterval(() => {
    const activeHolds = [...slotLocks.values()].filter(
      (l) => l.patientId === SIM_PATIENT.id
    ).length;
    if (activeHolds >= SIM_MAX_HOLDS) return;

    const doctorId = SIM_DOCTOR_IDS[Math.floor(Math.random() * SIM_DOCTOR_IDS.length)];
    const free = TIME_SLOTS.filter(
      (slot) => resolveSlotStatus(doctorId, slot, SIM_PATIENT.id) === 'free'
    );
    if (!free.length) return;

    const slot = free[Math.floor(Math.random() * free.length)];
    slotLocks.set(lockKey(doctorId, slot), {
      patientId: SIM_PATIENT.id,
      patientName: SIM_PATIENT.name,
      expiresAt: Date.now() + SLOT_LOCK_MS,
    });
  }, SIM_INTERVAL_MS);
}

export function stopOtherPatientSimulation(): void {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
}

startOtherPatientSimulation();

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

  /** Availability of a slot for a given patient. */
  getSlotStatus(doctorId: number, slot: string, patientId: string): SlotStatus {
    return resolveSlotStatus(doctorId, slot, patientId);
  },

  /**
   * Attempt to hold a slot for 60 seconds. Fails with { ok: false, status: 'booked' }
   * if another patient already booked the slot or is holding it.
   */
  reserveSlot(
    doctorId: number,
    slot: string,
    patientId: string,
    patientName: string
  ): ReserveResult {
    const status = resolveSlotStatus(doctorId, slot, patientId);
    if (status === 'booked') return { ok: false, status };
    slotLocks.set(lockKey(doctorId, slot), {
      patientId,
      patientName,
      expiresAt: Date.now() + SLOT_LOCK_MS,
    });
    return { ok: true, status };
  },

  /** Release a held slot (cancel / after a successful request). */
  releaseSlot(doctorId: number, slot: string, patientId: string): void {
    const key = lockKey(doctorId, slot);
    const lock = slotLocks.get(key);
    if (lock && lock.patientId === patientId) slotLocks.delete(key);
  },

  /** Final safety check right before sending a request. */
  isSlotBooked(doctorId: number, slot: string, patientId: string): boolean {
    return resolveSlotStatus(doctorId, slot, patientId) === 'booked';
  },
};
