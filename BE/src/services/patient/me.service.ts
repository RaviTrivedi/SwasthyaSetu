import { API_ERROR_MESSAGES } from '../../constants/messages.js';
import { HttpError } from '../../errors/http-error.js';
import * as userRepository from '../../repositories/user.repository.js';

interface UserRepository {
  findUserProfileById(id: string): Promise<Awaited<ReturnType<typeof userRepository.findUserProfileById>>>;
}

export function createGetCurrentUser(repository: UserRepository = userRepository) {
  return async (userId: string) => {
    const user = await repository.findUserProfileById(userId);
    if (!user || user.disabledAt) {
      throw new HttpError(401, API_ERROR_MESSAGES.UNAUTHORIZED);
    }
    return {
      id: user.id,
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  };
}

export const getCurrentUser = createGetCurrentUser();
export type GetCurrentUser = ReturnType<typeof createGetCurrentUser>;
