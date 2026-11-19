import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createFacilityProfileRouter } from '../src/routes/clinic/facility-profile.routes.js';
import { createFacilityProfile } from '../src/services/clinic/facility-profile.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { app } from '../src/app.js';

const profile = { id: randomUUID(), facilityName: 'Clinic', facilityType: 'CLINIC' as const,
 contactPersonName: 'Contact', contactEmail: 'contact@example.invalid', contactPhone: '+919876543210',
 address: 'Road', city: 'Pune', description: null as string | null, services: ['Consultation'], createdAt: new Date(), updatedAt: new Date() };

test('profile endpoints require identity, validate updates and return safe profiles and conflicts', async () => {
 const previous = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
 const owner = randomUUID(); let outcome: 'found' | 'missing' | 'multiple' = 'found'; let calls = 0;
 const service = createFacilityProfile(async (userId, input) => {
   calls++; assert.equal(userId, owner);
   if (outcome !== 'found') return { outcome };
   return { outcome: 'found', profile: Object.assign({}, profile, input, { description: input?.description ?? profile.description }) };
 });
 const application = express(); application.use(browserAccess); application.use('/api/v1/facilities', createFacilityProfileRouter(service)); application.use(errorHandler);
 const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
 const token = await new SignJWT({ role: 'PATIENT' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(owner).setIssuedAt().setExpirationTime('15m').sign(key);
 const request = (method = 'GET', body?: unknown, cookie = `access_token=${token}`) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/facilities/me?ownerId=attacker`, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 try {
  assert.equal((await request('GET', undefined, '')).status, 401);
  assert.equal((await request('PATCH', { city: 'City' }, '')).status, 401); assert.equal(calls, 0);
  const response = await request(); assert.equal(response.status, 200); assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(profile)));
  const updated = await request('PATCH', { facilityName: ' New Clinic ', contactEmail: ' NEW@EXAMPLE.COM ', services: [' Consultation '] });
  assert.equal(updated.status, 200); const body = await updated.json() as typeof profile;
  assert.equal(body.facilityName, 'New Clinic'); assert.equal(body.contactEmail, 'new@example.com'); assert.deepEqual(body.services, ['Consultation']);
  assert.deepEqual(Object.keys(body).sort(), Object.keys(profile).sort());
  for (const input of [{}, { id: profile.id }, { applicantId: owner }, { ownerId: owner }, { applicationId: randomUUID() }, { status: 'APPROVED' }, { reviewedByAdminId: owner }, { facilityName: '' }, { facilityType: 'OTHER' }, { contactPhone: '123' }, { services: [' '] }, { description: 'x'.repeat(2001) }]) {
   assert.equal((await request('PATCH', input)).status, 400);
  }
  outcome = 'missing'; assert.equal((await request()).status, 404); assert.equal((await request('PATCH', { city: 'City' })).status, 404);
  outcome = 'multiple'; assert.equal((await request()).status, 409); assert.equal((await request('PATCH', { city: 'City' })).status, 409);
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous; }
});

test('profile service sanitizes serialization conflicts', async () => {
 const service = createFacilityProfile(async () => { throw { code: 'P2034', message: 'private database details' }; });
 await assert.rejects(service(randomUUID()), { status: 409, message: 'Facility profile changed concurrently; please retry' });
});

test('profile route is mounted', async () => {
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 try { assert.equal((await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/facilities/me`)).status, 401); }
 finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('repository scopes reads and writes to enabled owners and approved applications', async () => {
 const { getDatabase, disconnectDatabase } = await import('../src/config/database.js');
 const { accessOwnedProfile } = await import('../src/repositories/facility-profile.repository.js');
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const original = db.$transaction; const owner = randomUUID();
 const storedProfile = { ...profile, services: profile.services.map(name => ({ id: randomUUID(), name, createdAt: new Date(), updatedAt: new Date() })) };
 let rows: { id: string; facility: typeof storedProfile | null }[] = [];
 let writes = 0;
 const fake = {
  facilityApplication: { async findMany(args: { where: unknown; take: number }) {
   assert.deepEqual(args.where, { applicantId: owner, status: 'APPROVED', OR: [{ applicantPatient: { disabledAt: null } }, { applicantAdmin: { disabledAt: null } }, { applicantDoctor: { disabledAt: null } }] }); assert.equal(args.take, 2); return rows;
  } },
  facility: {
   async updateMany(args: { where: unknown; data: unknown }) {
    writes++; assert.deepEqual(args.where, { id: profile.id, application: { applicantId: owner, status: 'APPROVED', OR: [{ applicantPatient: { disabledAt: null } }, { applicantAdmin: { disabledAt: null } }, { applicantDoctor: { disabledAt: null } }] } });
    assert.equal((args.data as { city: string }).city, 'Mumbai'); return { count: 1 };
   },
   async findUniqueOrThrow() { return { ...storedProfile, city: 'Mumbai' }; },
  },
 };
 db.$transaction = (async (callback: (tx: typeof fake) => unknown) => callback(fake)) as unknown as typeof db.$transaction;
 try {
  // Pending/rejected/other-owner records are excluded by the asserted database predicate.
  assert.equal((await accessOwnedProfile(owner)).outcome, 'missing');
  assert.equal((await accessOwnedProfile(owner, { city: 'Mumbai' })).outcome, 'missing');
  rows = [{ id: randomUUID(), facility: null }]; assert.equal((await accessOwnedProfile(owner)).outcome, 'missing');
  rows = [{ id: randomUUID(), facility: storedProfile }, { id: randomUUID(), facility: storedProfile }];
  assert.equal((await accessOwnedProfile(owner, { city: 'Mumbai' })).outcome, 'multiple'); assert.equal(writes, 0);
  rows = rows.slice(0, 1);
  assert.equal((await accessOwnedProfile(owner)).outcome, 'found'); assert.equal(writes, 0);
  const result = await accessOwnedProfile(owner, { city: 'Mumbai' }); assert.equal(result.outcome, 'found'); assert.equal(writes, 1);
 } finally { db.$transaction = original; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});

test('explicit profile creation requires approved ownership, validates input and handles duplicates', async () => {
 const { createProvisionFacilityProfile } = await import('../src/services/clinic/facility-profile.service.js');
 const previous = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
 const owner = randomUUID(); let outcome: 'created' | 'missing' | 'multiple' | 'exists' = 'created'; let calls = 0;
 const service = createProvisionFacilityProfile(async (id, input) => {
  assert.equal(id, owner); assert.equal(input.contactEmail, 'contact@example.invalid'); calls++;
  return outcome === 'created' ? { outcome, profile } : { outcome };
 });
 const application = express(); application.use(browserAccess);
 application.use('/api/v1/facilities', createFacilityProfileRouter(undefined, service)); application.use(errorHandler);
 const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
 const token = await new SignJWT({ role: 'PATIENT' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(owner).setIssuedAt().setExpirationTime('15m').sign(key);
 const { id, createdAt, updatedAt, description, ...input } = profile;
 const request = (body: unknown, authenticated = true) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/facilities/me`, {
  method: 'POST', headers: { Cookie: authenticated ? `access_token=${token}` : '', 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify(body),
 });
 try {
  assert.equal((await request(input, false)).status, 401); assert.equal(calls, 0);
  assert.equal((await request({ ...input, applicantId: owner })).status, 400); assert.equal(calls, 0);
  const response = await request(input); assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(profile)));
  outcome = 'missing'; assert.equal((await request(input)).status, 404);
  outcome = 'multiple'; assert.equal((await request(input)).status, 409);
  outcome = 'exists'; assert.equal((await request(input)).status, 409);
  for (const code of ['P2002', 'P2034']) {
   await assert.rejects(createProvisionFacilityProfile(async () => { throw { code }; })(owner, input), { status: 409 });
  }
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous; }
});


