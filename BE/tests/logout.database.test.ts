import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { revokeActiveSessionByTokenHash } from '../src/repositories/session.repository.js';

test('logout revokes only the current active session and leaves other sessions untouched', async () => {
  assert.equal(env.nodeEnv, 'development');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
  const db = getDatabase();
  const id = randomUUID();
  try {
    await db.user.create({ data: { id, firstName: 'Logout test', email: `${id}@example.invalid`, passwordHash: 'non-login-test-fixture' } });
    const make = (expiresAt: Date) => db.session.create({ data: { userId: id, tokenHash: randomBytes(32).toString('hex'), expiresAt } });
    const current = await make(new Date(Date.now() + 86400000));
    const other = await make(new Date(Date.now() + 86400000));
    const expired = await make(new Date(0));
    const oldHash = randomBytes(32).toString('hex');
    await db.session.update({ where: { id: other.id }, data: { consumedTokenHashes: [oldHash] } });
    assert.equal((await revokeActiveSessionByTokenHash(current.tokenHash)).count, 1);
    const revoked = await db.session.findUniqueOrThrow({ where: { id: current.id } });
    assert.ok(revoked.revokedAt);
    for (const tokenHash of [current.tokenHash, expired.tokenHash, oldHash, randomBytes(32).toString('hex')]) {
      assert.equal((await revokeActiveSessionByTokenHash(tokenHash)).count, 0);
    }
    assert.equal((await db.session.findUniqueOrThrow({ where: { id: other.id } })).revokedAt, null);
    assert.equal((await db.session.findUniqueOrThrow({ where: { id: expired.id } })).revokedAt, null);
    assert.deepEqual((await db.session.findUniqueOrThrow({ where: { id: current.id } })).revokedAt, revoked.revokedAt);
  } finally {
    await db.user.deleteMany({ where: { id } });
    await disconnectDatabase();
  }
});
