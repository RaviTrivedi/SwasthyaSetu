import { getDatabase } from '../config/database.js';

export function findResetUser(email: string) {
  return getDatabase().user.findUnique({ where: { email }, select: { id: true, email: true } });
}

export function createResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  return getDatabase().passwordResetToken.create({ data: input, select: { id: true } });
}

export function revokeResetToken(id: string) {
  return getDatabase().passwordResetToken.updateMany({ where: { id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
}

export function consumeResetToken(tokenHash: string, passwordHash: string) {
  return getDatabase().$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true } });
    if (!record) return false;
    // Serialize all reset confirmations for this user before touching token rows.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${record.userId}::UUID FOR UPDATE`;
    const now = new Date();
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.session.updateMany({ where: { userId: record.userId, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
    await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
    return true;
  });
}
