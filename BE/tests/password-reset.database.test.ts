import { createAccountFixture } from './account-fixture.js';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { createResetToken, consumeResetToken, revokeResetToken } from '../src/repositories/password-reset.repository.js';

test('inline resets are single-use, latest-link-only and revoke sessions for every account type', async () => {
 assert.equal(env.nodeEnv, 'development'); assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
 const db = getDatabase(); const ids: string[] = [];
 try {
  for (const kind of ['patient','admin','doctor'] as const) {
   const id = randomUUID(); ids.push(id);
   await createAccountFixture({ id, firstName: 'Reset fixture', email: `${id}@example.invalid`, passwordHash: 'old-hash', role: { connect: { name: kind.toUpperCase() } } });
   const session = await db.session.create({ data: { userId: id, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now()+60000) } });
   const token = () => randomBytes(32).toString('hex'); const old = token(), current = token();
   const input = { userId: id, expiresAt: new Date(Date.now()+60000) };
   const oldRecord = await createResetToken({ ...input, tokenHash: old });
   await createResetToken({ ...input, tokenHash: current });
   await revokeResetToken(oldRecord.id); // An older email failure must not revoke the latest link.
   assert.equal(await consumeResetToken(current, 'bad-hash', kind === 'admin' ? 'doctor' : 'admin'), false);
   assert.equal(await consumeResetToken(old, 'bad-hash'), false);
   assert.deepEqual((await Promise.all([consumeResetToken(current, 'new-hash'), consumeResetToken(current, 'new-hash')])).sort(), [false,true]);
   const account = await (db[kind] as typeof db.patient).findUniqueOrThrow({ where: { id } });
   assert.equal(account.passwordHash,'new-hash'); assert.equal(account.resetTokenHash,null); assert.equal(account.resetExpiresAt,null);
   assert.ok((await db.session.findUniqueOrThrow({ where: { id: session.id } })).revokedAt);
   assert.equal(await consumeResetToken(current,'bad-hash'),false);
   const expired=token(); await createResetToken({ userId:id, tokenHash:expired, expiresAt:new Date(0) });
   assert.equal(await consumeResetToken(expired,'bad-hash'),false);
   const revoked=token(); const record=await createResetToken({ ...input,tokenHash:revoked }); await revokeResetToken(record.id);
   assert.equal(await consumeResetToken(revoked,'bad-hash'),false);
  }
  assert.equal(await consumeResetToken(randomBytes(32).toString('hex'),'bad-hash'),false);
 } finally {
  for(const kind of ['patient','admin','doctor'] as const) await (db[kind] as typeof db.patient).deleteMany({ where:{ id:{ in:ids } } });
  await disconnectDatabase();
 }
});

