import { User } from '../types';

/**
 * User discovery endpoints are NOT part of the current API contract
 * (see API_INTEGRATION_GUIDE.md) — sessions are scheduled by the care team.
 * Kept as an empty stub so the directory screen renders its empty state.
 */
export const userService = {
  async getUsersByRole(_roleId: 3 | 4): Promise<User[]> {
    return [];
  },
};
