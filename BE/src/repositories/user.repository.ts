import { getDatabase } from '../config/database.js';
import { Role } from '../constants/roles.js';

export async function createUser(input: { firstName: string; email: string; passwordHash: string }) {
  const user = await getDatabase().user.create({ data: { ...input, email: input.email.trim().toLowerCase(),
    role: { connect: { name: Role.PATIENT } } }, include: { role: true } });
  const { roleId: _roleId, ...identity } = user; return { ...identity, role: user.role.name };
}
export async function findUserByEmail(email: string) {
  const user = await getDatabase().user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { role: true } });
  if (!user) return null; const { roleId: _roleId, ...identity } = user; return { ...identity, role: user.role.name };
}
export async function findUserProfileById(id: string) {
  const user = await getDatabase().user.findUnique({ where: { id }, select: {
    id: true, firstName: true, email: true, role: { select: { name: true } }, createdAt: true, disabledAt: true,
  } });
  return user ? { ...user, role: user.role.name } : null;
}

