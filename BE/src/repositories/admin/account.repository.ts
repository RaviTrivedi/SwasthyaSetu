import { getDatabase } from '../../config/database.js';
import { Role } from '../../constants/roles.js';

export function findAccount(email: string) {
  return getDatabase().user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
}
export function createAdmin(input: { firstName: string; email: string; passwordHash: string }) {
  return getDatabase().user.create({ data: { ...input, email: input.email.trim().toLowerCase(),
    role: { connect: { name: Role.ADMIN } },
  }, select: { id: true } });
}

