import * as sessionRepository from '../../repositories/session.repository.js';

interface SessionRepository {
  revokeActiveSessionsByUserId(userId: string): Promise<unknown>;
}

export function createLogoutAll(repository: SessionRepository = sessionRepository) {
  return async (authenticatedUserId: string): Promise<void> => {
    await repository.revokeActiveSessionsByUserId(authenticatedUserId);
  };
}

export const logoutAll = createLogoutAll();
export type LogoutAll = ReturnType<typeof createLogoutAll>;
