import { getDatabase } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import { Role } from '../constants/roles.js';

type Account = { id: string; firstName: string; email: string; passwordHash: string; role: { name: string }; disabledAt: Date | null; createdAt: Date; updatedAt: Date };
export function accountCredentials(user: Account) {
  return { id: user.id, firstName: user.firstName, email: user.email, passwordHash: user.passwordHash,
    role: user.role.name, disabledAt: user.disabledAt, createdAt: user.createdAt, updatedAt: user.updatedAt };
}
export async function createUser(input: { firstName: string; email: string; passwordHash: string }) {
  return accountCredentials(await getDatabase().patient.create({ data: {
    firstName: input.firstName, email: input.email.trim().toLowerCase(), passwordHash: input.passwordHash,
    role: { connect: { name: Role.PATIENT } },
  }, include: { role: true } }));
}
// IDs and normalized emails are globally unique, enforced by database triggers.
export async function findIdentity(where: { id: string } | { email: string }, db: Prisma.TransactionClient = getDatabase()) {
  for (const kind of ['patient', 'admin', 'doctor'] as const) {
    const user = await (db[kind] as typeof db.patient).findUnique({ where, include: { role: true } });
    if (user) return { kind, user };
  }
  return null;
}
export async function findUserByEmail(email: string) {
  const identity = await findIdentity({ email: email.trim().toLowerCase() });
  return identity ? accountCredentials(identity.user) : null;
}
export async function findUserProfileById(id: string) {
  const identity = await findIdentity({ id });
  if (!identity) return null;
  const { user } = identity;
  return { id: user.id, firstName: user.firstName, email: user.email, role: user.role.name, createdAt: user.createdAt, disabledAt: user.disabledAt };
}

