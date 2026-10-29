import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { verify } from '@node-rs/argon2';
import { createPasswordReset } from '../src/services/patient/password-reset.service.js';
import { createResetRequestController, createResetConfirmController } from '../src/controllers/patient/password-reset.controller.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { HttpError } from '../src/errors/http-error.js';

async function fixture() {
  const records: { userId: string; tokenHash: string; expiresAt: Date; used: boolean; revoked: boolean }[] = [];
  const deliveries: { email: string; token: string; expiresAt: Date }[] = [];
  const passwords: string[] = [];
  const emails: string[] = [];
  const service = createPasswordReset({
    async findResetUser(email) { emails.push(email); return email === 'known@example.invalid' ? { id: 'test-user', email } : null; },
    async createResetToken(input) { records.push({ ...input, used: false, revoked: false }); return { id: String(records.length - 1) }; },
    async revokeResetToken(id) { records[Number(id)]!.revoked = true; return { count: 1 }; },
    async consumeResetToken(tokenHash, passwordHash) {
      const record = records.find(item => item.tokenHash === tokenHash);
      if (!record || record.used || record.revoked || record.expiresAt <= new Date()) return false;
      record.used = true;
      passwords.push(passwordHash);
      return true;
    },
  }, async input => { deliveries.push(input); }, () => {});
  const app = express();
  app.use(express.json());
  app.post('/request', createResetRequestController(service));
  app.post('/confirm', createResetConfirmController(service));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { records, deliveries, passwords, emails,
    post(path: string, body: object) { return fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); },
    async close() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}

test('known and unknown emails have identical safe responses; only token hash is stored', async () => {
  const f = await fixture();
  try {
    for (const email of ['  KNOWN@EXAMPLE.INVALID ', 'unknown@example.invalid']) {
      const response = await f.post('request', { email });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { message: 'Password reset request received' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.deepEqual(f.emails, ['known@example.invalid', 'unknown@example.invalid']);
    assert.equal(f.deliveries.length, 1);
    const token = f.deliveries[0]!.token;
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(f.records[0]!.tokenHash, createHash('sha256').update(token).digest('hex'));
    assert.equal(JSON.stringify(f.records).includes(token), false);
    assert.ok(f.records[0]!.expiresAt.getTime() <= Date.now() + 30 * 60000);
  } finally { await f.close(); }
});

test('confirmation hashes the new password, consumes token, and returns no secrets', async () => {
  const f = await fixture();
  try {
    await (await f.post('request', { email: 'known@example.invalid' })).json();
    const token = f.deliveries[0]!.token;
    const newPassword = ' new test password ';
    const response = await f.post('confirm', { token, newPassword });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'Password reset complete. Please sign in again.' });
    assert.match(response.headers.get('set-cookie')!, /^refresh_token=;/);
    assert.match(f.passwords[0]!, /^\$argon2id\$/);
    assert.equal(await verify(f.passwords[0]!, newPassword), true);
    const replay = await f.post('confirm', { token, newPassword });
    assert.equal(replay.status, 400);
    assert.deepEqual(await replay.json(), { message: 'Invalid or expired reset token' });
    assert.equal(f.passwords.length, 1);
  } finally { await f.close(); }
});

test('unknown, expired, revoked and malformed tokens fail generically; roles/email cannot be changed', async () => {
  const f = await fixture();
  try {
    await (await f.post('request', { email: 'known@example.invalid' })).json();
    const token = f.deliveries[0]!.token;
    f.records[0]!.expiresAt = new Date(0);
    for (const value of [token, 'bad', randomBytes(32).toString('base64url')]) {
      const response = await f.post('confirm', { token: value, newPassword: 'new password 123' });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { message: 'Invalid or expired reset token' });
    }
    f.records[0]!.expiresAt = new Date(Date.now() + 60000);
    f.records[0]!.revoked = true;
    assert.equal((await f.post('confirm', { token, newPassword: 'new password 123' })).status, 400);
    for (const extra of [{ role: 'ADMIN' }, { email: 'other@example.invalid' }, { newPassword: 'short' }]) {
      const response = await f.post('confirm', { token, newPassword: 'new password 123', ...extra });
      assert.equal(response.status, 400);
      await response.json();
    }
    assert.equal((await f.post('request', { email: 'invalid' })).status, 400);
    assert.equal(f.passwords.length, 0);
  } finally { await f.close(); }
});

test('unavailable delivery fails before account lookup for every email', async () => {
  let queried = false;
  const service = createPasswordReset({
    async findResetUser() { queried = true; return null; },
    async createResetToken() { return { id: 'unused' }; },
    async revokeResetToken() { return { count: 0 }; },
    async consumeResetToken() { return false; },
  }, async () => {}, () => { throw new HttpError(503, 'Password reset delivery is unavailable'); });
  for (const email of ['known@example.invalid', 'unknown@example.invalid']) {
    await assert.rejects(service.request(email), { status: 503, message: 'Password reset delivery is unavailable' });
  }
  assert.equal(queried, false);
});

test('delivery failures keep the generic result and never log provider secrets or tokens', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => { logs.push(args); });
  let rawToken = '';
  let revoked = false;
  const service = createPasswordReset({
    async findResetUser(email) { return { id: 'user', email }; },
    async createResetToken() { return { id: 'record' }; },
    async revokeResetToken() { revoked = true; return { count: 1 }; },
    async consumeResetToken() { return false; },
  }, async input => { rawToken = input.token; throw new Error(`provider secret ${input.token}`); }, () => {});
  await service.request('known@example.invalid');
  assert.equal(revoked, true);
  assert.deepEqual(logs, [[JSON.stringify({ event: 'password_reset_delivery_failed' })]]);
  assert.equal(JSON.stringify(logs).includes(rawToken), false);
});
