import { getDatabase } from '../config/database.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Shared user persistence; request validation and password hashing belong above it.
export function createUser(input: {
  firstName: string;
  email: string;
  passwordHash: string;
}) {
  return getDatabase().user.create({
    data: {
      firstName: input.firstName,
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      role: 'PATIENT',
    },
  });
}

export function findUserByEmail(email: string) {
  return getDatabase().user.findUnique({ where: { email: normalizeEmail(email) } });
}
