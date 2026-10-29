import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { HttpError } from '../../errors/http-error.js';
import * as userRepository from '../../repositories/user.repository.js';
import type { LoginInput } from '../../validation/patient/login.schema.js';

interface UserRepository {
  findUserByEmail(email: string): Promise<Awaited<ReturnType<typeof userRepository.findUserByEmail>>>;
}

let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  // Avoid a cheap early return for unknown accounts. Cache only the dummy hash.
  dummyHash ??= hash(randomBytes(32), {
    algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1,
  });
  return dummyHash;
}

export function createLoginPatient(repository: UserRepository = userRepository) {
  return async (input: LoginInput) => {
    const user = await repository.findUserByEmail(input.email.trim().toLowerCase());
    const passwordHash = user?.passwordHash ?? await getDummyHash();
    const valid = await verify(passwordHash, input.password);
    if (!user || !valid) {
      throw new HttpError(401, 'Invalid email or password');
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

export const loginPatient = createLoginPatient();
export type LoginPatient = ReturnType<typeof createLoginPatient>;
