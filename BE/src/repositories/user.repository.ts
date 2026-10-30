import { getDatabase } from "../config/database.js";
import { Role } from "../constants/roles.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Shared user persistence;
// request validation and password hashing belong above it.
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
      role: Role.PATIENT,
    },
  });
}

export function findUserByEmail(email: string) {
  // Prisma handles the database query when awaited by the service; no match resolves to null.
  // This internal record includes passwordHash for verification, so never send it directly to clients.
  return getDatabase().user.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

export function findUserProfileById(id: string) {
  return getDatabase().user.findUnique({
    where: { id },
    select: { id: true, firstName: true, email: true, role: true, createdAt: true, disabledAt: true },
  });
}

