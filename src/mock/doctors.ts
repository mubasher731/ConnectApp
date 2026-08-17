import { User } from '../types';

export interface MockDoctor {
  email: string;
  password: string;
  user: User;
}

/**
 * Mock doctor accounts used until the backend exposes doctor login.
 *
 * Demo credentials:
 *   doctor@fountain.com / 12345678
 */
export const MOCK_DOCTORS: MockDoctor[] = [
  {
    email: 'doctor@fountain.com',
    password: '12345678',
    user: {
      id: 2,
      name: 'Dr. Ahmad Khan',
      email: 'doctor@fountain.com',
      role_id: 3, // doctor
      status: 'online',
      created_at: '2026-08-01T00:00:00.000Z',
    },
  },
];

/** Convenience getter for the default demo doctor. */
export const getDemoDoctor = (): User => MOCK_DOCTORS[0].user;
