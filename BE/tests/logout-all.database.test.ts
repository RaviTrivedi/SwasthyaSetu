import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { revokeActiveSessionsByUserId } from '../src/repositories/session.repository.js';

test('logout-all revokes all active sessions for one user only', async () => {
  assert.equal(env.nodeEnv, 'development');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
  const db = getDatabase();
  const ids = [randomUUID(), randomUUID()];
  try {
    for (const id of ids) await db.user.create({ data: { id, firstName: 'Logout-all test', email: `${id}@example.invalid`, passwordHash: 'non-login-test-fixture' } });
    const make = (userId: string, expiresAt = new Date(Date.now() + 86400000), revokedAt: Date | null = null) =>
      db.session.create({ data: { userId, tokenHash: randomBytes(32).toString('hex'), expiresAt, revokedAt } });
    const first = await make(ids[0]!);
    const second = await make(ids[0]!);
    const expired = await make(ids[0]!, new Date(0));
    const previouslyRevoked = await make(ids[0]!, new Date(Date.now() + 86400000), new Date(1000));
    const other = await make(ids[1]!);
    assert.equal((await revokeActiveSessionsByUserId(ids[0]!)).count, 2);
    for (const session of [first, second]) assert.ok((await db.session.findUniqueOrThrow({ where: { id: session.id } })).revokedAt);
    assert.deepEqual(await db.session.findUniqueOrThrow({ where: { id: other.id } }), other);
    assert.deepEqual(await db.session.findUniqueOrThrow({ where: { id: expired.id } }), expired);
    assert.deepEqual(await db.session.findUniqueOrThrow({ where: { id: previouslyRevoked.id } }), previouslyRevoked);
    assert.equal((await revokeActiveSessionsByUserId(ids[0]!)).count, 0);
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await disconnectDatabase();
  }
});
