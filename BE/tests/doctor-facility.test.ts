import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createDoctorFacilityRouter } from '../src/routes/clinic/doctor-facility.routes.js';
import { createRequireDoctor } from '../src/middleware/require-doctor.js';
import { createFacilityProfile } from '../src/services/clinic/facility-profile.service.js';
import { createFacilityServices } from '../src/services/clinic/facility-service.service.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const profile = { id: randomUUID(), facilityName: 'Clinic', facilityType: 'CLINIC' as const, contactPersonName: 'Contact', contactEmail: 'contact@example.invalid', contactPhone: '+919876543210', address: 'Road', city: 'Pune', description: null, services: ['Consultation'], createdAt: new Date(), updatedAt: new Date() };
const item = { id: randomUUID(), name: 'Consultation', createdAt: new Date(), updatedAt: new Date() };
test('Doctor owner routes enforce authentication, live role, strict input and safe profile/service responses', async () => {
 const previous = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
 const owner = randomUUID(); let disabled = false; let outcome: 'found' | 'missing' | 'multiple' = 'found';
 const authorize = createRequireDoctor(async id => ({ id, firstName: 'Member', email: 'member@example.invalid', role: 'DOCTOR', createdAt: new Date(), disabledAt: disabled ? new Date() : null }));
 const profiles = createFacilityProfile(async (id, input) => id !== owner || outcome === 'missing' ? { outcome: 'missing' } : outcome === 'multiple' ? { outcome: 'multiple' } : { outcome: 'found', profile: Object.assign({}, profile, input, { description: input?.description ?? null }) });
 const services = createFacilityServices(async (id, op) => {
   if (id !== owner || outcome === 'missing') return { outcome: 'missing' };
   if (outcome === 'multiple') return { outcome: 'multiple' };
   if ('id' in op && op.id !== item.id) return { outcome: 'serviceMissing' };
   if (op.kind === 'list') return { outcome: 'listed', services: [item] };
   if (op.kind === 'delete') return { outcome: 'deleted' };
   return { outcome: 'saved', service: { ...item, name: op.name } };
 });
 const app = express(); app.use(browserAccess); app.use('/api/v1/doctor/facility', createDoctorFacilityRouter(profiles, services, authorize)); app.use(errorHandler);
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 const token = (role: string, id = owner) => new SignJWT({ role }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(id).setIssuedAt().setExpirationTime('15m').sign(key);
 const doctor = await token('DOCTOR');
 const request = (path = '', method = 'GET', body?: unknown, auth = doctor) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/doctor/facility${path}`, { method, headers: { Cookie: auth ? `access_token=${auth}` : '', 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 try {
   assert.equal((await request('', 'GET', undefined, '')).status, 401);
   for (const role of ['PATIENT', 'ADMIN']) for (const [path, method] of [['/application-status', 'GET'], ['', 'GET'], ['', 'PATCH'], ['/services', 'GET'], ['/services', 'POST'], [`/services/${item.id}`, 'PATCH'], [`/services/${item.id}`, 'DELETE']]) {
     assert.equal((await request(path, method, method === 'PATCH' || method === 'POST' ? { name: 'X' } : undefined, await token(role))).status, 403);
   }
   disabled = true; assert.equal((await request()).status, 403); disabled = false;
   const response = await request(); assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(profile)));
   assert.equal((await request('', 'PATCH', { city: ' New city ' })).status, 200);
   for (const input of [{}, { ownerId: owner }, { status: 'APPROVED' }, { reviewerId: owner }, { contactPhone: '123' }]) assert.equal((await request('', 'PATCH', input)).status, 400);
   assert.deepEqual(await (await request('/services')).json(), JSON.parse(JSON.stringify([item])));
   const added = await request('/services', 'POST', { name: ' New service ' }); assert.equal(added.status, 201);
   assert.deepEqual(Object.keys(await added.json()).sort(), Object.keys(item).sort());
   assert.equal((await request(`/services/${item.id}`, 'PATCH', { name: 'Updated' })).status, 200);
   assert.equal((await request(`/services/${item.id}`, 'DELETE')).status, 204);
   for (const input of [{}, { name: '' }, { name: 'x'.repeat(101) }, { name: 'X', facilityId: profile.id }]) assert.equal((await request('/services', 'POST', input)).status, 400);
   assert.equal((await request('/services/not-a-uuid', 'DELETE')).status, 400);
   for (const method of ['PATCH', 'DELETE']) assert.equal((await request(`/services/${randomUUID()}`, method, method === 'PATCH' ? { name: 'X' } : undefined)).status, 404);
   const other = await token('DOCTOR', randomUUID()); assert.equal((await request('', 'GET', undefined, other)).status, 404); assert.equal((await request('/services', 'POST', { name: 'X' }, other)).status, 404);
   outcome = 'missing'; assert.equal((await request()).status, 404); assert.equal((await request('/services')).status, 404);
   outcome = 'multiple'; assert.equal((await request()).status, 409); assert.equal((await request('/services')).status, 409);
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous; }
});

test('service conflicts and missing resources use safe centralized messages', async () => {
 for (const [outcome, status] of [['multiple', 409], ['missing', 404], ['serviceMissing', 404], ['limit', 409]] as const) {
   await assert.rejects(createFacilityServices(async () => ({ outcome }))(randomUUID(), { kind: 'list' }), { status });
 }
 await assert.rejects(createFacilityServices(async () => { throw { code: 'P2034', message: 'private' }; })(randomUUID(), { kind: 'list' }), { status: 409 });
});

test('service repository scopes every operation to an enabled Doctor and approved owned application', async () => {
 const { getDatabase, disconnectDatabase } = await import('../src/config/database.js');
 const { accessOwnedServices } = await import('../src/repositories/facility-service.repository.js');
 const { ownedApplication } = await import('../src/repositories/facility-profile.repository.js');
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const original = db.$transaction; const owner = randomUUID(); let available = true; let affected = 1;
 const ownership = ownedApplication(owner, true);
 assert.deepEqual(ownership, { applicantId: owner, status: 'APPROVED', applicantDoctorId: owner, applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } });
 const scope = { facilityId: profile.id, facility: { application: ownership } };
 const fake = {
   facilityApplication: { async findMany(args: { where: unknown; take: number }) { assert.deepEqual(args.where, ownership); assert.equal(args.take, 2); return available ? [{ facility: { id: profile.id } }] : []; } },
   facility: { async updateMany(args: { where: unknown }) { assert.deepEqual(args.where, { id: profile.id, application: ownership }); return { count: 1 }; } },
   facilityService: {
     async findMany(args: { where: unknown }) { assert.deepEqual(args.where, scope); return [{ ...item, position: 0 }]; },
     async create(args: { data: { facilityId: string; name: string } }) { assert.equal(args.data.facilityId, profile.id); return item; },
     async updateMany(args: { where: unknown }) { assert.deepEqual(args.where, { ...scope, id: item.id }); return { count: affected }; },
     async deleteMany(args: { where: unknown }) { assert.deepEqual(args.where, { ...scope, id: item.id }); return { count: affected }; },
     async findFirstOrThrow(args: { where: unknown }) { assert.deepEqual(args.where, { ...scope, id: item.id }); return item; },
   },
 };
 db.$transaction = (async (fn: (tx: typeof fake) => unknown, options: unknown) => { assert.deepEqual(options, { isolationLevel: 'Serializable' }); return fn(fake); }) as unknown as typeof db.$transaction;
 try {
   assert.equal((await accessOwnedServices(owner, { kind: 'list' })).outcome, 'listed');
   assert.equal((await accessOwnedServices(owner, { kind: 'create', name: 'X' })).outcome, 'saved');
   assert.equal((await accessOwnedServices(owner, { kind: 'update', id: item.id, name: 'X' })).outcome, 'saved');
   assert.equal((await accessOwnedServices(owner, { kind: 'delete', id: item.id })).outcome, 'deleted');
   affected = 0; assert.equal((await accessOwnedServices(owner, { kind: 'update', id: item.id, name: 'X' })).outcome, 'serviceMissing');
   assert.equal((await accessOwnedServices(owner, { kind: 'delete', id: item.id })).outcome, 'serviceMissing');
   available = false; assert.equal((await accessOwnedServices(owner, { kind: 'create', name: 'X' })).outcome, 'missing');
 } finally { db.$transaction = original; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});


test('profile service replacement retains existing IDs and deletes only removed owned services', async () => {
 const { replaceServices } = await import('../src/repositories/facility-profile.repository.js');
 const retained = randomUUID(); const created = randomUUID();
 const writes: unknown[] = [];
 const fake = { facilityService: {
   async findMany(args: unknown) { assert.deepEqual(args, { where: { facilityId: profile.id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] }); return [{ id: retained, name: 'Consultation' }]; },
   async update(args: unknown) { writes.push(args); },
   async create(args: unknown) { writes.push(args); return { id: created }; },
   async deleteMany(args: unknown) { writes.push(args); },
 } };
 await replaceServices(fake as unknown as Parameters<typeof replaceServices>[0], profile.id, ['Consultation', 'X']);
 assert.deepEqual(writes, [
   { where: { id: retained, facilityId: profile.id }, data: { position: 0 } },
   { data: { facilityId: profile.id, name: 'X', position: 1 } },
   { where: { facilityId: profile.id, id: { notIn: [retained, created] } } },
 ]);
});

// Owner status endpoint never reads another account's applications or exposes review details.
test('Doctor application access is scoped and reports profile readiness without sensitive fields', async () => {
 const { getDatabase, disconnectDatabase } = await import('../src/config/database.js');
 const { doctorApplicationAccess } = await import('../src/repositories/clinic/application-access.repository.js');
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const original = db.facilityApplication.findMany; const owner = randomUUID();
 let rows = [{ id: randomUUID(), facilityName: 'Clinic', status: 'PENDING', facility: null as { id: string } | null }];
 db.facilityApplication.findMany = (async (args: { where: unknown; select: unknown }) => {
  assert.deepEqual(args.where, { applicantId: owner, applicantDoctorId: owner, applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } });
  assert.deepEqual(args.select, { id: true, facilityName: true, status: true, facility: { select: { id: true } } }); return rows;
 }) as unknown as typeof original;
 try {
  for (const status of ['PENDING','REJECTED']) { rows[0]!.status = status; const result = await doctorApplicationAccess(owner); assert.equal(result.profileAvailable, false); assert.equal(result.approvedCount, 0); assert.deepEqual(Object.keys(result.applications[0]!).sort(), ['facilityName','id','status']); }
  rows[0]!.status = 'APPROVED'; assert.equal((await doctorApplicationAccess(owner)).profileAvailable, false);
  rows[0]!.facility = { id: randomUUID() }; assert.equal((await doctorApplicationAccess(owner)).profileAvailable, true);
  rows.push({ ...rows[0]! }); assert.equal((await doctorApplicationAccess(owner)).profileAvailable, false);
  rows = []; assert.deepEqual(await doctorApplicationAccess(owner), { applications: [], approvedCount: 0, profileAvailable: false });
 } finally { db.facilityApplication.findMany = original; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});

