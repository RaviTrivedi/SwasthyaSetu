import { findUserByEmail } from '../user.repository.js';
import { getDatabase } from '../../config/database.js';
import { Role } from '../../constants/roles.js';

export function findAccount(email: string) {
  return findUserByEmail(email).then(user => user ? { id: user.id } : null);
}
export function createAdmin(input: { firstName: string; email: string; passwordHash: string }) {
  return getDatabase().admin.create({ data: { ...input, email: input.email.trim().toLowerCase(),
    role: { connect: { name: Role.ADMIN } },
  }, select: { id: true } });
}

