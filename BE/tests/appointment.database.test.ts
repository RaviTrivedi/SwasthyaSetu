import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createAppointmentRouter } from '../src/routes/patient/appointment.routes.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { createAccountFixture } from './account-fixture.js';
import { submitAppointment } from '../src/services/patient/appointment.service.js';
import { accessOwnedSchedule } from '../src/repositories/opening-hours.repository.js';

test('PostgreSQL concurrency allows one booking, rejects past/unapproved slots, and preserves reservations on schedule changes', async () => {
 assert.equal(env.nodeEnv, 'development');
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
 const db = getDatabase(); const owner = randomUUID(); const patientIds = [randomUUID(), randomUUID()]; const applicationId = randomUUID(); const facilityId = randomUUID();
 const fields = { facilityName: 'Booking test', facilityType: 'CLINIC' as const, contactPersonName: 'Test', contactEmail: 'test@example.invalid', contactPhone: '+919876543210', address: 'Test', city: 'Test' };
 try {
  for (const id of [owner, ...patientIds]) await createAccountFixture({ id, firstName: 'Test', email: `${id}@example.invalid`, passwordHash: 'non-login-fixture', role: { connect: { name: id === owner ? 'DOCTOR' : 'PATIENT' } } });
  await db.facilityApplication.create({ data: { id: applicationId, applicantId: owner, status: 'APPROVED', ...fields, services: ['Consultation'] } });
  await db.facility.create({ data: { id: facilityId, applicationId, ...fields } });
  const startsAt = new Date(Date.now() + 86400000);
  const slot = await db.facilitySlot.create({ data: { facilityId, startsAt, endsAt: new Date(startsAt.getTime() + 1800000) } });
  // Exercise real HTTP authentication, transaction locking, and conflict translation together.
  const secret = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32);
  process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
  const app = express(); app.use(browserAccess); app.use('/api/v1/patient/appointments', createAppointmentRouter()); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
   const tokens = await Promise.all(patientIds.map(id => new SignJWT({ role: 'PATIENT' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(id).setIssuedAt().setExpirationTime('15m').sign(key)));
   const attempts = await Promise.all(tokens.map(token => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/patient/appointments`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ slotId: slot.id }),
   })));
   assert.deepEqual(attempts.map(result => result.status).sort(), [201, 409]);
   const winner = await attempts.find(result => result.status === 201)!.json() as { status: string };
   assert.equal(winner.status, 'BOOKED');
   assert.deepEqual(await attempts.find(result => result.status === 409)!.json(), { message: 'This appointment slot is unavailable or already reserved. Choose another future slot.' });
  } finally {
   await new Promise<void>(resolve => server.close(() => resolve()));
   if (secret === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = secret;
  }
  // Bypass HTTP validation deliberately: a varchar overflow forces the database INSERT to fail
  // after updateMany claimed the slot. Assert PostgreSQL, not a mock, rolls that claim back.
  const rollbackSlot = await db.facilitySlot.create({ data: { facilityId, startsAt: new Date(startsAt.getTime() + 7200000), endsAt: new Date(startsAt.getTime() + 9000000) } });
  await assert.rejects(submitAppointment(patientIds[0]!, { slotId: rollbackSlot.id, appointmentNote: 'x'.repeat(2001) }), { code: 'P2000' });
  assert.equal((await db.facilitySlot.findUniqueOrThrow({ where: { id: rollbackSlot.id } })).bookedAt, null);
  assert.equal(await db.appointment.count({ where: { slotId: rollbackSlot.id } }), 0);
  assert.equal((await submitAppointment(patientIds[1]!, { slotId: rollbackSlot.id })).status, 'BOOKED');
  assert.equal(await db.appointment.count({ where: { slotId: slot.id, status: 'BOOKED' } }), 1);
  const reserved = await db.facilitySlot.findUniqueOrThrow({ where: { id: slot.id } }); assert.ok(reserved.bookedAt);
  await accessOwnedSchedule(owner, { kind: 'put', schedule: { timezone: 'Asia/Kolkata', days: Array.from({ length: 7 }, (_, day) => ({ day, periods: [] })) } });
  assert.deepEqual(await db.facilitySlot.findUniqueOrThrow({ where: { id: slot.id } }), reserved);
  const past = await db.facilitySlot.create({ data: { facilityId, startsAt: new Date(0), endsAt: new Date(1800000) } });
  await assert.rejects(submitAppointment(patientIds[0]!, { slotId: past.id }), { status: 409 });
  const future = await db.facilitySlot.create({ data: { facilityId, startsAt: new Date(startsAt.getTime() + 3600000), endsAt: new Date(startsAt.getTime() + 5400000) } });
  await db.facilityApplication.update({ where: { id: applicationId }, data: { status: 'REJECTED' } });
  await assert.rejects(submitAppointment(patientIds[0]!, { slotId: future.id }), { status: 409 });
  await assert.rejects(submitAppointment(patientIds[0]!, { slotId: randomUUID() }), { status: 409 });
 } finally {
  // Only this test's UUID-owned fixtures are removed; never use this against production.
  await db.appointment.deleteMany({ where: { patientId: { in: patientIds } } });
  await db.facilitySlot.deleteMany({ where: { facilityId } });
  await db.facilityOpeningHours.deleteMany({ where: { facilityId } });
  await db.facility.deleteMany({ where: { id: facilityId } });
  await db.facilityApplication.deleteMany({ where: { id: applicationId } });
  await db.patient.deleteMany({ where: { id: { in: patientIds } } });
  await db.doctor.deleteMany({ where: { id: owner } });
  await disconnectDatabase();
 }
});


