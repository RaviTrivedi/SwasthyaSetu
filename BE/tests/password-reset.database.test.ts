import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { hash, verify } from '@node-rs/argon2';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { consumeResetToken } from '../src/repositories/password-reset.repository.js';

test('reset is single-use under concurrency and atomically updates password and revokes sessions', async () => {
  assert.equal(env.nodeEnv, 'development');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
  const db = getDatabase();
  const ids = [randomUUID(), randomUUID()];
  try {
    for (const id of ids) await db.user.create({ data: { id, firstName: 'Reset test', email: `${id}@example.invalid`, passwordHash: 'non-login-test-fixture' } });
    for (const userId of [ids[0]!, ids[0]!, ids[1]!]) await db.session.create({ data: { userId, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 86400000) } });
    const tokenHash = randomBytes(32).toString('hex');
    const record = await db.passwordResetToken.create({ data: { userId: ids[0]!, tokenHash, expiresAt: new Date(Date.now() + 60000) } });
    const extra = await db.passwordResetToken.create({ data: { userId: ids[0]!, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 60000) } });
    const passwordHash = await hash('new test password', { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    const results = await Promise.all([consumeResetToken(tokenHash, passwordHash), consumeResetToken(tokenHash, passwordHash)]);
    assert.deepEqual(results.sort(), [false, true]);
    const user = await db.user.findUniqueOrThrow({ where: { id: ids[0]! } });
    assert.equal(await verify(user.passwordHash, 'new test password'), true);
    assert.equal(user.email, `${ids[0]}@example.invalid`);
    assert.equal(user.role, 'PATIENT');
    assert.ok((await db.passwordResetToken.findUniqueOrThrow({ where: { id: record.id } })).usedAt);
    assert.ok((await db.passwordResetToken.findUniqueOrThrow({ where: { id: extra.id } })).revokedAt);
    assert.equal(await db.session.count({ where: { userId: ids[0]!, revokedAt: null } }), 0);
    assert.equal(await db.session.count({ where: { userId: ids[1]!, revokedAt: null } }), 1);
    assert.equal(await consumeResetToken(tokenHash, 'must-not-be-stored'), false);
    assert.equal(await consumeResetToken(randomBytes(32).toString('hex'), 'must-not-be-stored'), false);
    const expired = await db.passwordResetToken.create({ data: { userId: ids[0]!, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(0) } });
    assert.equal(await consumeResetToken(expired.tokenHash, 'must-not-be-stored'), false);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids[0]! } })).passwordHash, passwordHash);
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await disconnectDatabase();
  }
});
