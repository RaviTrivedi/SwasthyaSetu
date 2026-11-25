import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createAppointmentRouter } from '../src/routes/patient/appointment.routes.js';
import { createRequirePatient } from '../src/middleware/require-patient.js';
import { createBookAppointment } from '../src/services/patient/appointment.service.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { HttpError } from '../src/errors/http-error.js';
import { API_ERROR_MESSAGES as messages } from '../src/constants/messages.js';
const slotId = randomUUID();
const response = { id: randomUUID(), status: 'BOOKED' as const, createdAt: new Date(), facility: { id: randomUUID(), facilityName: 'Clinic', facilityType: 'CLINIC' as const, address: 'Road', city: 'City', timezone: 'Asia/Kolkata' }, slot: { startsAt: new Date('2030-01-01T03:30:00Z'), endsAt: new Date('2030-01-01T04:00:00Z') } };
test('booking HTTP requires active Patient, verifies identity, validates fields and returns safe 201', async () => {
 const previous = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
 const patientId = randomUUID(); let disabled = false; let unavailable = false; let calls = 0;
 const authorize = createRequirePatient(async id => ({ id, firstName: 'Patient', email: 'patient@example.invalid', role: 'PATIENT', disabledAt: disabled ? new Date() : null, createdAt: new Date() }));
 const book = createBookAppointment(async (id, input) => { calls++; assert.equal(id, patientId); assert.equal(input.slotId, slotId); assert.equal(input.appointmentNote, 'Checkup'); if (unavailable) throw new HttpError(409, messages.SLOT_UNAVAILABLE); return response; });
 const app = express(); app.use(browserAccess); app.use('/api/v1/patient/appointments', createAppointmentRouter(book, authorize)); app.use(errorHandler);
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 const token = (role: string) => new SignJWT({ role }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(patientId).setIssuedAt().setExpirationTime('15m').sign(key);
 const request = (body: unknown, auth: string, csrf = '1') => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/patient/appointments?patientId=ignored`, { method: 'POST', headers: { Cookie: auth ? `access_token=${auth}` : '', 'Content-Type': 'application/json', 'X-CSRF-Protection': csrf }, body: JSON.stringify(body) });
 const input = { slotId, appointmentNote: ' Checkup ' };
 try {
  assert.equal((await request(input, '')).status, 401);
  for (const role of ['ADMIN','DOCTOR']) assert.equal((await request(input, await token(role))).status, 403);
  const auth = await token('PATIENT'); disabled = true; assert.equal((await request(input, auth)).status, 403); disabled = false;
  assert.equal((await request(input, auth, '')).status, 403);
  for (const invalid of [{}, { slotId: 'bad' }, { slotId, appointmentNote: '' }, { slotId, appointmentNote: 'x'.repeat(2001) }, ...['patientId','facilityId','doctorId','status','approvedAt'].map(field => ({ ...input, [field]: 'injected' }))]) assert.equal((await request(invalid, auth)).status, 400);
  assert.equal(calls, 0); const result = await request(input, auth); assert.equal(result.status, 201); assert.deepEqual(await result.json(), JSON.parse(JSON.stringify(response)));
  unavailable = true; const conflict = await request(input, auth); assert.equal(conflict.status, 409); assert.deepEqual(await conflict.json(), { message: messages.SLOT_UNAVAILABLE });
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous; }
});
test('database unique/concurrent conflicts use the same unavailable message', async () => {
 for (const code of ['P2002','P2034']) await assert.rejects(createBookAppointment(async () => { throw { code, message: 'private' }; })(randomUUID(), { slotId }), { status: 409, message: messages.SLOT_UNAVAILABLE });
});
test('repository reserves atomically with future/approval predicates and rolls back if creation fails', async () => {
 const { getDatabase, disconnectDatabase } = await import('../src/config/database.js');
 const { bookAppointment } = await import('../src/repositories/patient/appointment.repository.js');
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const original = db.$transaction; const patientId = randomUUID(); const facilityId = response.facility.id;
 let eligible = true; let exists = true; let available = true; let reserved = false; let failCreate = false; let creates = 0; let locks = 0;
 const fake = {
  async $queryRaw() { locks++; },
  patient: { async findFirst(args: { where: unknown }) { assert.deepEqual(args.where, { id: patientId, disabledAt: null, role: { name: 'PATIENT' } }); return eligible ? { id: patientId } : null; } },
  facilitySlot: {
   async findUnique(args: unknown) { assert.deepEqual(args, { where: { id: slotId }, select: { facilityId: true } }); return exists ? { facilityId } : null; },
   async updateMany(args: { where: { startsAt: { gt: Date } }; data: { bookedAt: Date } }) {
    assert.equal(locks, 2);
    assert.deepEqual(args, { where: { id: slotId, facilityId, bookedAt: null, appointment: null, startsAt: { gt: args.where.startsAt.gt }, facility: { application: { status: 'APPROVED', applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } } } }, data: { bookedAt: args.where.startsAt.gt } });
    assert.ok(args.data.bookedAt instanceof Date);
    if (!available || reserved) return { count: 0 }; reserved = true; return { count: 1 };
   },
  },
  appointment: { async create(args: { data: unknown; select: unknown }) {
   assert.deepEqual(args.data, { patientId, slotId, appointmentNote: null, status: 'BOOKED' }); creates++;
   assert.ok(!JSON.stringify(args.select).includes('patient')); assert.ok(!JSON.stringify(args.select).includes('appointmentNote'));
   if (failCreate) throw new Error('database unavailable');
   return { ...response, slot: { ...response.slot, facility: { ...response.facility, openingHours: { timezone: 'Asia/Kolkata' } } } };
  } },
 };
 db.$transaction = (async (fn: (tx: typeof fake) => unknown, options: unknown) => { assert.deepEqual(options, { isolationLevel: 'ReadCommitted' }); locks = 0; const before = reserved; try { return await fn(fake); } catch (e) { reserved = before; throw e; } }) as unknown as typeof db.$transaction;
 try {
  eligible = false; await assert.rejects(bookAppointment(patientId, { slotId }), { status: 403 }); eligible = true;
  exists = false; await assert.rejects(bookAppointment(patientId, { slotId }), { status: 409 }); exists = true;
  available = false; await assert.rejects(bookAppointment(patientId, { slotId }), { status: 409 }); available = true; assert.equal(creates, 0);
  failCreate = true; await assert.rejects(bookAppointment(patientId, { slotId })); assert.equal(reserved, false); failCreate = false;
  assert.deepEqual(await bookAppointment(patientId, { slotId }), response);
  await assert.rejects(bookAppointment(patientId, { slotId }), { status: 409 }); assert.equal(reserved, true);
 } finally { db.$transaction = original; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});

