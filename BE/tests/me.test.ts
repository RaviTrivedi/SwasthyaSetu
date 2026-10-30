import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createGetCurrentUser } from '../src/services/patient/me.service.js';
import { createPatientAuthRouter } from '../src/routes/patient/auth.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { app } from '../src/app.js';

test('me uses verified identity and current database profile, excluding all private fields', async () => {
  const oldSecret = process.env.ACCESS_TOKEN_SECRET;
  const secret = randomBytes(32).toString('hex');
  process.env.ACCESS_TOKEN_SECRET = secret;
  const id = randomUUID();
  const profile = { id, firstName: 'Updated name', email: 'updated@example.invalid',
    role: 'PATIENT' as const, createdAt: new Date('2026-10-01T00:00:00Z'), disabledAt: null as Date | null,
    passwordHash: 'private-hash', password: 'private-password', sessions: ['private-session'],
    passwordResetTokens: ['private-reset'], accessToken: 'private-access', refreshToken: 'private-refresh' };
  let record: typeof profile | null = profile;
  let fail = false;
  const calls: string[] = [];
  const service = createGetCurrentUser({ async findUserProfileById(userId) {
    calls.push(userId);
    if (fail) throw new Error('private database details');
    return record;
  } });
  const application = express();
  application.use('/api/v1/auth', createPatientAuthRouter(undefined, undefined, undefined, undefined, undefined, service));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const now = Math.floor(Date.now() / 1000);
  const sign = (key: Uint8Array, exp = now + 900) => new SignJWT({ sub: id, role: 'PATIENT', firstName: 'Stale claim', iat: now, exp })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(key);
  const key = Buffer.from(secret, 'hex');
  const token = await sign(key);
  const get = (authorization?: string) => fetch(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/me?userId=attacker&role=ADMIN`,
    { headers: { ...(authorization ? { Authorization: authorization } : {}), Cookie: 'refresh_token=ignored' } });
  try {
    for (const header of [undefined, 'Bearer malformed', `Bearer ${await sign(randomBytes(32))}`, `Bearer ${await sign(key, now - 1)}`]) {
      const response = await get(header);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: 'Unauthorized' });
      assert.equal(response.headers.get('set-cookie'), null);
    }
    assert.deepEqual(calls, []);
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await get(`Bearer ${token}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { user: { id, firstName: profile.firstName,
        email: profile.email, role: 'PATIENT', createdAt: profile.createdAt.toISOString() } });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('set-cookie'), null);
    }
    assert.deepEqual(calls, [id, id]);
    record = null;
    for (const disabled of [false, true]) {
      if (disabled) record = { ...profile, disabledAt: new Date() };
      const response = await get(`Bearer ${token}`);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: 'Unauthorized' });
      assert.equal(response.headers.get('set-cookie'), null);
    }
    fail = true;
    const response = await get(`Bearer ${token}`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
    assert.equal(response.headers.get('set-cookie'), null);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (oldSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = oldSecret;
  }
});

test('production application mounts me behind authentication', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/me`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: 'Unauthorized' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
