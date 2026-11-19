import { accountCredentials } from './user.repository.js';

import { getDatabase } from '../config/database.js';

export function rotateSession(input: { tokenHash: string; nextTokenHash: string; expiresAt: Date }) {
  return getDatabase().$transaction(async (tx) => {
    // Keep old hashes on the same row so both current-token and replay requests
    // lock the same family, including when PostgreSQL rechecks after waiting.
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Session"
      WHERE "tokenHash" = ${input.tokenHash}
         OR "consumedTokenHashes" @> ARRAY[${input.tokenHash}]::TEXT[]
      FOR UPDATE`;
    const id = rows[0]?.id;
    if (!id) return { status: 'invalid' } as const;
    const session = await tx.session.findUniqueOrThrow({
      where: { id },
      include: { patient: { include: { role: true } }, admin: { include: { role: true } }, doctor: { include: { role: true } } },
    });
    const owner = session.patient ?? session.admin ?? session.doctor;
    const account = owner ? accountCredentials(owner) : null;
    if (!account || account.disabledAt) return { status: 'invalid' } as const;
    const now = new Date();
    if (session.revokedAt || session.consumedTokenHashes.includes(input.tokenHash)) {
      await tx.session.update({ where: { id }, data: { revokedAt: session.revokedAt ?? now } });
      // Return instead of throwing so revocation commits before the 401.
      return { status: 'replay', sessionId: id } as const;
    }
    if (session.expiresAt <= now) return { status: 'invalid' } as const;
    await tx.session.update({ where: { id }, data: {
      tokenHash: input.nextTokenHash,
      consumedTokenHashes: { push: input.tokenHash },
      expiresAt: input.expiresAt,
    } });
    return { status: 'rotated', user: { id: account.id, firstName: account.firstName, email: account.email, role: account.role, createdAt: account.createdAt } } as const;
  });
}

