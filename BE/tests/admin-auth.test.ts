import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { hash, verify } from '@node-rs/argon2';
import { jwtVerify } from 'jose';
import { createProvisionAdmin } from '../src/services/admin/provision.service.js';
import { ADMIN_PROVISION_MESSAGES } from '../src/config/admin-provision.js';
import { createLoginAdmin } from '../src/services/admin/login.service.js';
import { createAdminAuthRouter } from '../src/routes/admin/auth.routes.js';
import { createIssueSession } from '../src/services/patient/session.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { app } from '../src/app.js';

test('provisioning validates, hashes, normalizes and refuses existing accounts and unique races', async () => {
  const source = { ADMIN_EMAIL: ' ADMIN@Example.invalid ', ADMIN_PASSWORD: randomBytes(24).toString('hex') };
  let saved: { firstName: string; email: string; passwordHash: string } | undefined;
  const provision = createProvisionAdmin({
    async findAccount(email) { assert.equal(email, 'admin@example.invalid'); return saved ? { id: 'existing' } : null; },
    async createAdmin(input) { saved = input; return { id: 'created' }; },
  });
  await assert.rejects(provision({}), { message: ADMIN_PROVISION_MESSAGES.invalid });
  await assert.rejects(provision({ ...source, ADMIN_PASSWORD: 'short' }), { message: ADMIN_PROVISION_MESSAGES.invalid });
  await provision(source);
  assert.ok(saved); assert.equal(saved.email, 'admin@example.invalid');
  assert.equal('password' in saved, false);
  assert.match(saved.passwordHash, /^\$argon2id\$/);
  assert.equal(await verify(saved.passwordHash, source.ADMIN_PASSWORD), true);
  const original = saved;
  await assert.rejects(provision({ ...source, ADMIN_PASSWORD: 'another-long-password' }), { message: ADMIN_PROVISION_MESSAGES.exists });
  assert.equal(saved, original);
  const race = createProvisionAdmin({ async findAccount() { return null; }, async createAdmin() { throw { code: 'P2002', message: 'private details' }; } });
  await assert.rejects(race(source), { message: ADMIN_PROVISION_MESSAGES.exists });
});

test('admin login shares secure sessions and rejects unknown, incorrect, disabled and non-admin credentials', async () => {
  const previous = process.env.ACCESS_TOKEN_SECRET;
  const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
  const password = randomBytes(24).toString('hex');
  const user = { id: randomUUID(), firstName: 'Admin', email: 'admin@example.invalid', passwordHash: await hash(password, { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 }), role: 'ADMIN' as 'ADMIN' | 'PATIENT', disabledAt: null as Date | null, createdAt: new Date(), updatedAt: new Date() };
  const login = createLoginAdmin({ async findUserByEmail(email) { return email === user.email ? user : null; } });
  const sessions: { userId: string; tokenHash: string; expiresAt: Date }[] = [];
  const issue = createIssueSession({ async createSession(input) { sessions.push(input); } });
  const application = express(); application.use('/login', createAdminAuthRouter(login, issue)); application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
  const post = (body: unknown) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/login/login`, { method: 'POST', headers: { 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const response = await post({ email: ' ADMIN@Example.invalid ', password });
    assert.equal(response.status, 200);
    const body = await response.json() as { user: object; accessToken: string };
    assert.deepEqual(body.user, { id: user.id, firstName: user.firstName, email: user.email, role: 'ADMIN', createdAt: user.createdAt.toISOString() });
    assert.deepEqual(Object.keys(body).sort(), ['user']);
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /Path=\/api\/v1\/auth/);
    assert.match(cookie, /SameSite=/); assert.match(cookie, /Expires=/);
    assert.match(sessions[0]!.tokenHash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(sessions).includes(/refresh_token=([^;]+)/.exec(cookie)![1]!), false);
    const { payload } = await jwtVerify(response.headers.getSetCookie().find(value => value.startsWith('access_token='))!.split(';')[0]!.slice('access_token='.length), key); assert.equal(payload.role, 'ADMIN'); assert.equal(payload.sub, user.id);
    for (const credentials of [{ email: user.email, password: 'incorrect' }, { email: 'unknown@example.invalid', password }]) {
      const failed = await post(credentials); assert.equal(failed.status, 401); assert.deepEqual(await failed.json(), { message: 'Invalid email or password' }); assert.equal(failed.headers.get('set-cookie'), null);
    }
    for (const role of ['PATIENT', 'ADMIN'] as const) {
      user.role = role; user.disabledAt = role === 'ADMIN' ? new Date() : null;
      const failed = await post({ email: user.email, password }); assert.equal(failed.status, 401); assert.deepEqual(await failed.json(), { message: 'Invalid email or password' });
    }
    assert.equal((await post({ email: user.email, password, role: 'ADMIN' })).status, 400);
    assert.equal(sessions.length, 1);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous;
  }
});

test('admin login is mounted and validates input without public admin registration', async () => {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/admin/auth`;
    assert.equal((await fetch(`${base}/login`, { method: 'POST', headers: { 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
    assert.equal((await fetch(`${base}/register`, { method: 'POST', headers: { 'X-CSRF-Protection': '1' } })).status, 404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

