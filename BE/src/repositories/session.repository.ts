import { getDatabase } from '../config/database.js';

export function createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  return getDatabase().session.create({ data: input });
}

// Internal persistence operation for later logout/refresh handling.
export function revokeSession(id: string, userId: string) {
  return getDatabase().session.updateMany({
    where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() },
  });
}

export function revokeActiveSessionByTokenHash(tokenHash: string) {
  const now = new Date();
  return getDatabase().session.updateMany({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now },
  });
}

export function revokeActiveSessionsByUserId(userId: string) {
  const now = new Date();
  return getDatabase().session.updateMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now },
  });
}
