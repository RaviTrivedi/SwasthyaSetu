import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { verify } from '@node-rs/argon2';
import { jwtVerify } from 'jose';
import { createRegisterDoctor, createLoginDoctor } from '../src/services/clinic/auth.service.js';
import { createClinicAuthRouter } from '../src/routes/clinic/auth.routes.js';
import { createIssueSession } from '../src/services/patient/session.service.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { app } from '../src/app.js';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { createUser } from '../src/repositories/clinic/account.repository.js';

test('organization signup/signin use shared security without requiring facility data', async () => {
 const previous = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
 type User = { id: string; firstName: string; email: string; passwordHash: string; role: string; createdAt: Date; updatedAt: Date; disabledAt: Date | null };
 let saved: User | null = null;
 const repository = {
  async findUserByEmail(email: string) { return saved?.email === email ? saved : null; },
  async createUser(input: { firstName: string; email: string; passwordHash: string }) {
   saved = { ...input, id: randomUUID(), role: 'DOCTOR', createdAt: new Date(), updatedAt: new Date(), disabledAt: null }; return saved;
  },
 };
 const sessions: { userId: string; tokenHash: string; expiresAt: Date }[] = [];
 const issue = createIssueSession({ async createSession(input) { sessions.push(input); } });
 const application = express(); application.use(browserAccess);
 application.use('/clinic/auth', createClinicAuthRouter(createRegisterDoctor(repository), createLoginDoctor(repository), issue));
 application.use(errorHandler);
 const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
 const post = (path: string, body: unknown, csrf = true) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/clinic/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Protection': '1' } : {}) }, body: JSON.stringify(body) });
 const input = { firstName: ' Clinic Member ', email: ' MEMBER@EXAMPLE.INVALID ', password: randomBytes(16).toString('hex') };
 try {
  assert.equal((await post('register', input, false)).status, 403);
  for (const body of [{}, { ...input, password: 'short' }, { ...input, email: 'bad' }, { ...input, role: 'ADMIN' }, { ...input, facilityId: randomUUID() }]) {
   assert.equal((await post('register', body)).status, 400);
  }
  const registered = await post('register', input); assert.equal(registered.status, 201);
  const publicUser = await registered.json() as Record<string, unknown>;
  assert.deepEqual(Object.keys(publicUser).sort(), ['id','firstName','email','role','createdAt'].sort());
  assert.equal(publicUser.role, 'DOCTOR'); assert.equal(publicUser.firstName, 'Clinic Member'); assert.equal(publicUser.email, 'member@example.invalid');
  assert.equal(registered.headers.get('set-cookie'), null); assert.equal(sessions.length, 0);
  const user = await repository.findUserByEmail('member@example.invalid'); assert.ok(user);
  assert.match(user.passwordHash, /^\$argon2id\$/); assert.ok(await verify(user.passwordHash, input.password));
  for (const role of ['PATIENT', 'ADMIN', 'DOCTOR']) {
   user.role = role;
   assert.equal((await post('register', input)).status, 409);
  }
  const signedIn = await post('login', { email: input.email, password: input.password }); assert.equal(signedIn.status, 200);
  assert.deepEqual(await signedIn.json(), { user: publicUser });
  const cookies = signedIn.headers.getSetCookie(); assert.equal(cookies.length, 2);
  for (const cookie of cookies) { assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=/); }
  const access = cookies.find(c => c.startsWith('access_token='))!;
  assert.match(access, /Path=\/api\/v1;/);
  assert.equal((await jwtVerify(access.split(';')[0]!.slice('access_token='.length), key)).payload.role, 'DOCTOR');
  const refresh = cookies.find(c => c.startsWith('refresh_token='))!; assert.match(refresh, /Path=\/api\/v1\/auth/);
  assert.match(sessions[0]!.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(sessions).includes(refresh.split(';')[0]!.slice('refresh_token='.length)), false);
  for (const credentials of [{ email: input.email, password: 'incorrect' }, { email: 'unknown@example.invalid', password: input.password }]) {
   const failed = await post('login', credentials); assert.equal(failed.status, 401); assert.deepEqual(await failed.json(), { message: 'Invalid email or password' });
  }
  for (const role of ['PATIENT', 'ADMIN', 'STAFF', 'DOCTOR']) {
   user.role = role; user.disabledAt = role === 'DOCTOR' ? new Date() : null;
   const failed = await post('login', { email: input.email, password: input.password }); assert.equal(failed.status, 401);
   assert.deepEqual(await failed.json(), { message: 'Invalid email or password' }); assert.equal(failed.headers.get('set-cookie'), null);
  }
  assert.equal((await post('login', { email: input.email, password: input.password, role: 'DOCTOR' })).status, 400);
  assert.equal(sessions.length, 1);
  await assert.rejects(createRegisterDoctor({ ...repository, async findUserByEmail() { return null; }, async createUser() { throw { code: 'P2002' }; } })(input), { status: 409 });
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous; }
});

test('clinic repository forces DOCTOR and stores credentials in the shared User table', async () => {
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const original = db.doctor.create;
 db.doctor.create = (async ({ data }: any) => {
  assert.deepEqual(data, { firstName: 'Member', email: 'member@example.invalid', passwordHash: 'hash', role: { connect: { name: 'DOCTOR' } } });
  return { ...data, id: randomUUID(), roleId: 5, role: { name: 'DOCTOR' }, disabledAt: null, createdAt: new Date(), updatedAt: new Date() };
 }) as unknown as typeof db.doctor.create;
 try { assert.equal((await createUser({ firstName: 'Member', email: ' MEMBER@EXAMPLE.INVALID ', passwordHash: 'hash' })).role, 'DOCTOR'); }
 finally { db.doctor.create = original; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});

test('clinic auth endpoints are mounted without authentication or a profile prerequisite', async () => {
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 try {
  for (const path of ['register','login']) {
   const result = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/clinic/auth/${path}`, { method: 'POST', headers: { 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' }, body: '{}' });
   assert.equal(result.status, 400);
  }
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});



