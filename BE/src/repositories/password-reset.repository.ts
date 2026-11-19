import { getDatabase } from '../config/database.js';
import { findIdentity } from './user.repository.js';

export async function findResetUser(email: string, kind?: 'patient' | 'admin' | 'doctor') {
  if (kind) return (getDatabase()[kind] as ReturnType<typeof getDatabase>['patient']).findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true } });
  const identity = await findIdentity({ email: email.trim().toLowerCase() });
  return identity ? { id: identity.user.id, email: identity.user.email } : null;
}
export async function createResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }, kind?: 'patient' | 'admin' | 'doctor') {
  const identity = await findIdentity({ id: input.userId });
  if (!identity || (kind && identity.kind !== kind)) throw new Error('Reset account unavailable');
  await (getDatabase()[identity.kind] as ReturnType<typeof getDatabase>["patient"]).update({ where: { id: input.userId }, data: { resetTokenHash: input.tokenHash, resetExpiresAt: input.expiresAt } });
  // A failure revokes only this particular link, never a newer request's link.
  return { id: input.tokenHash };
}
export async function revokeResetToken(tokenHash: string, accountKind?: 'patient' | 'admin' | 'doctor') {
  let count = 0;
  for (const kind of accountKind ? [accountKind] : ['patient', 'admin', 'doctor'] as const) {
    count += (await (getDatabase()[kind] as ReturnType<typeof getDatabase>["patient"]).updateMany({ where: { resetTokenHash: tokenHash }, data: { resetTokenHash: null, resetExpiresAt: null } })).count;
  }
  return { count };
}
export async function consumeResetToken(tokenHash: string, passwordHash: string, accountKind?: 'patient' | 'admin' | 'doctor') {
  return getDatabase().$transaction(async tx => {
    for (const kind of accountKind ? [accountKind] : ['patient', 'admin', 'doctor'] as const) {
      const user = await (tx[kind] as typeof tx.patient).findUnique({ where: { resetTokenHash: tokenHash }, select: { id: true } });
      if (!user) continue;
      const now = new Date();
      const result = await (tx[kind] as typeof tx.patient).updateMany({ where: { id: user.id, resetTokenHash: tokenHash, resetExpiresAt: { gt: now } },
        data: { passwordHash, resetTokenHash: null, resetExpiresAt: null } });
      if (result.count !== 1) return false;
      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
      return true;
    }
    return false;
  });
}

