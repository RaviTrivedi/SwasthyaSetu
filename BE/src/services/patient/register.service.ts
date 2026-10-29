import { hash } from '@node-rs/argon2';
import { HttpError } from '../../errors/http-error.js';
import * as userRepository from '../../repositories/user.repository.js';
import type { RegisterInput } from '../../validation/patient/register.schema.js';

interface UserRepository {
  findUserByEmail(email: string): Promise<Awaited<ReturnType<typeof userRepository.findUserByEmail>>>;
  createUser(input: Parameters<typeof userRepository.createUser>[0]): Promise<Awaited<ReturnType<typeof userRepository.createUser>>>;
}
const conflictMessage = 'Email is already registered';

export function createRegisterPatient(repository: UserRepository = userRepository) {
  return async (input: RegisterInput) => {
    const email = input.email.trim().toLowerCase();
    if (await repository.findUserByEmail(email)) {
      throw new HttpError(409, conflictMessage);
    }

    const passwordHash = await hash(input.password, {
      // Argon2id = 2; the library's ambient const enum cannot be imported with
      // this project's verbatimModuleSyntax setting.
      algorithm: 2,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    let user;
    try {
      // Repository assigns PATIENT; no role or raw password is forwarded.
      user = await repository.createUser({ firstName: input.firstName, email, passwordHash });
    } catch (error) {
      // The unique constraint also covers concurrent registrations after lookup.
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new HttpError(409, conflictMessage);
      }
      throw error;
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

export const registerPatient = createRegisterPatient();
export type RegisterPatient = ReturnType<typeof createRegisterPatient>;
