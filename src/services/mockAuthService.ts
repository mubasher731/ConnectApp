import { tokenStore } from '../api/client';
import { socketService } from '../api/socket';
import { MOCK_DOCTORS } from '../mock/doctors';
import { User } from '../types';

export interface MockAuthResult {
  token: string;
  user: User;
}

/**
 * Offline doctor login — used until the backend exposes doctor endpoints.
 * Validates against local mock data and stores a local session, so the
 * doctor flow works entirely without a server.
 *
 * Demo credentials: doctor@fountain.com / 12345678
 *
 * When the real endpoints are ready, swap the body of `signInAsDoctor`
 * with the live authService call (same return shape).
 */
export const mockAuthService = {
  async signInAsDoctor(email: string, password: string): Promise<MockAuthResult> {
    const match = MOCK_DOCTORS.find(
      (d) =>
        d.email.toLowerCase() === email.trim().toLowerCase() &&
        d.password === password
    );

    if (!match) {
      throw new Error(
        'Invalid doctor credentials. Try doctor@fountain.com / 12345678.'
      );
    }

    const token = `mock-doctor-token-${match.user.id}`;
    await tokenStore.setSession({ token, user: match.user });
    socketService.setUser(match.user);
    return { token, user: match.user };
  },
};
