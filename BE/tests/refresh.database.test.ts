import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { rotateSession } from '../src/repositories/refresh.repository.js';

test('PostgreSQL serializes refresh and replay revokes the winning session family', async () => {
  const url = new URL(requireDatabaseUrl());
  assert.equal(env.nodeEnv, 'development', 'Database tests require development mode');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Database tests require loopback PostgreSQL');
  const db = getDatabase();
  const id = randomUUID();
  const original = randomBytes(32).toString('hex');
  const next = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')];
  const expiry = new Date(Date.now() + 86400000);
  try {
    await db.user.create({ data: { id, firstName: 'Refresh test', email: `${id}@example.invalid`, passwordHash: 'non-login-test-fixture' } });
    const session = await db.session.create({ data: { userId: id, tokenHash: original, expiresAt: expiry } });
    const results = await Promise.all(next.map(nextTokenHash => rotateSession({ tokenHash: original, nextTokenHash, expiresAt: expiry })));
    assert.equal(results.filter(result => result.status === 'rotated').length, 1);
    assert.equal(results.filter(result => result.status === 'replay').length, 1);
    const saved = await db.session.findUniqueOrThrow({ where: { id: session.id } });
    assert.ok(saved.revokedAt);
    assert.deepEqual(saved.consumedTokenHashes, [original]);
    assert.ok(next.includes(saved.tokenHash));
    const reused = await rotateSession({ tokenHash: saved.tokenHash, nextTokenHash: randomBytes(32).toString('hex'), expiresAt: expiry });
    assert.equal(reused.status, 'replay');
    const expired = await db.session.create({ data: { userId: id, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(0) } });
    assert.equal((await rotateSession({ tokenHash: expired.tokenHash, nextTokenHash: randomBytes(32).toString('hex'), expiresAt: expiry })).status, 'invalid');
    assert.equal((await db.session.findUniqueOrThrow({ where: { id: expired.id } })).tokenHash, expired.tokenHash);
  } finally {
    // Remove only this test's UUID-owned fixture; sessions cascade with it.
    await db.user.deleteMany({ where: { id } });
    await disconnectDatabase();
  }
});
