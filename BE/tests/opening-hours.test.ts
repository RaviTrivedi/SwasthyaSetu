import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { SignJWT } from 'jose';
import { openingHoursSchema, slotQuerySchema, type OpeningHours } from '../src/validation/clinic/opening-hours.schema.js';
import { generateSlots } from '../src/utils/slot-generation.js';
import { createDoctorFacilityRouter } from '../src/routes/clinic/doctor-facility.routes.js';
import { createRequireDoctor } from '../src/middleware/require-doctor.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { createOpeningHours } from '../src/services/clinic/opening-hours.service.js';
const schedule = (timezone = 'Asia/Kolkata', open = '09:00', close = '11:00'): OpeningHours => ({ timezone, days: Array.from({ length: 7 }, (_, day) => ({ day, periods: [{ open, close }] })) });
const now = new Date('2030-01-01T00:00:00Z');
test('30-minute boundaries, partial tails, closed periods and no past slots', () => {
 const hours = schedule();
 const slots = generateSlots(hours, { from: '2030-01-01', to: '2030-01-01' }, now);
 assert.deepEqual(slots.map(s => s.startsAt.toISOString()), ['03:30', '04:00', '04:30', '05:00'].map(t => `2030-01-01T${t}:00.000Z`));
 assert.ok(slots.every(s => s.endsAt.getTime() - s.startsAt.getTime() === 1800000));
 assert.equal(generateSlots(schedule('UTC', '09:10', '10:15'), { from: '2030-01-01', to: '2030-01-01' }, now).length, 2);
 assert.equal(generateSlots(hours, { from: '2030-01-01', to: '2030-01-01' }, new Date('2030-01-01T04:01:00Z')).length, 2);
 hours.days.forEach(d => d.periods = []); assert.deepEqual(generateSlots(hours, { from: '2030-01-01', to: '2030-01-02' }, now), []);
});
test('timezone dates and daylight saving gaps/folds never produce ambiguous or crossing slots', () => {
 const range = { from: '2030-03-10', to: '2030-03-10' };
 const spring = generateSlots(schedule('America/New_York', '01:00', '04:00'), range, now);
 assert.deepEqual(spring.map(s => s.startsAt.toISOString().slice(11,16)), ['06:00', '07:00', '07:30']);
 const fall = generateSlots(schedule('America/New_York', '00:00', '03:00'), { from: '2030-11-03', to: '2030-11-03' }, now);
 assert.deepEqual(fall.map(s => s.startsAt.toISOString().slice(11,16)), ['04:00', '07:00', '07:30']);
 const east = generateSlots(schedule('Pacific/Kiritimati', '00:00', '01:00'), { from: '2030-01-02', to: '2030-01-02' }, now);
 assert.equal(east[0]?.startsAt.toISOString(), '2030-01-01T10:00:00.000Z');
});
test('schedule and query validation rejects overlap, unknown fields, bad times and unbounded ranges', () => {
 assert.ok(openingHoursSchema.safeParse(schedule()).success);
 for (const invalid of [{ ...schedule(), timezone: 'not-a-zone' }, { ...schedule(), facilityId: randomUUID() }, { ...schedule(), intervalMinutes: 15 }, { ...schedule(), days: [] }, { ...schedule(), days: Array(7).fill(schedule().days[0]) }, schedule('UTC','11:00','09:00'), schedule('UTC','9:00','11:00'), schedule('UTC','09:00','24:00')]) assert.equal(openingHoursSchema.safeParse(invalid).success, false);
 const hours = schedule(); hours.days[0]!.periods.push({ open: '10:00', close: '12:00' }); assert.equal(openingHoursSchema.safeParse(hours).success, false);
 hours.days[0]!.periods[1] = { open: '11:00', close: '12:00' }; assert.ok(openingHoursSchema.safeParse(hours).success);
 for (const query of [{}, { date: '2030-02-30' }, { from: '2030-01-01', to: '2030-02-01' }, { from: '2030-01-02', to: '2030-01-01' }, { date: '2030-01-01', ownerId: 'x' }]) assert.equal(slotQuerySchema.safeParse(query).success, false);
});
test('opening hour routes authenticate Doctors, validate bodies, use verified owner and hide internal fields', async () => {
 const previous = process.env.ACCESS_TOKEN_SECRET; const key = randomBytes(32); process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
 const owner = randomUUID(); let calls = 0;
 const authorize = createRequireDoctor(async id => ({ id, role: 'DOCTOR', firstName: 'Test', email: 'test@example.invalid', createdAt: now, disabledAt: null }));
 const service = createOpeningHours(async (id, op) => { assert.equal(id, owner); calls++; return op.kind === 'slots' ? { timezone: 'UTC', intervalMinutes: 30, slots: [] } : schedule(); });
 const app = express(); app.use(browserAccess); app.use('/api/v1/doctor/facility', createDoctorFacilityRouter(undefined, undefined, authorize, service)); app.use(errorHandler);
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 const token = (role: string) => new SignJWT({ role }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(owner).setIssuedAt().setExpirationTime('15m').sign(key);
 const request = (path: string, method: string, auth: string, body?: unknown) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/doctor/facility${path}`, { method, headers: { Cookie: auth ? `access_token=${auth}` : '', 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) });
 try {
  for (const [path, method] of [['/opening-hours','GET'], ['/opening-hours','PUT'], ['/slots?date=2030-01-01','GET']] as const) {
   assert.equal((await request(path, method, '', method === 'PUT' ? schedule() : undefined)).status, 401);
   for (const role of ['PATIENT', 'ADMIN']) assert.equal((await request(path, method, await token(role), method === 'PUT' ? schedule() : undefined)).status, 403);
  }
  assert.equal(calls, 0); const auth = await token('DOCTOR');
  assert.deepEqual(await (await request('/opening-hours', 'GET', auth)).json(), schedule());
  assert.equal((await request('/opening-hours', 'PUT', auth, schedule())).status, 200);
  assert.equal((await request('/opening-hours', 'PUT', auth, { ...schedule(), ownerId: owner })).status, 400);
  assert.equal((await request('/slots', 'GET', auth)).status, 400);
  assert.deepEqual(await (await request('/slots?date=2030-01-01', 'GET', auth)).json(), { timezone: 'UTC', intervalMinutes: 30, slots: [] });
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous; }
});


test('repository isolates owners, prevents duplicate slots and preserves booked slots on replacement', async () => {
 const { getDatabase, disconnectDatabase } = await import('../src/config/database.js');
 const { accessOwnedSchedule } = await import('../src/repositories/opening-hours.repository.js');
 const { ownedApplication } = await import('../src/repositories/facility-profile.repository.js');
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
 const db = getDatabase(); const original = db.$transaction; const owner = randomUUID(); const facilityId = randomUUID();
 let count = 1; let stored: OpeningHours | null = schedule('UTC'); let writes = 0;
 type Slot = { id: string; facilityId: string; startsAt: Date; endsAt: Date; bookedAt: Date | null };
 let rows: Slot[] = [{ id: randomUUID(), facilityId, startsAt: new Date('2030-01-01T09:00:00Z'), endsAt: new Date('2030-01-01T09:30:00Z'), bookedAt: now }];
 const booked = { ...rows[0]! };
 const fake = {
  async $queryRaw() {},
  facilityApplication: { async findMany(args: { where: unknown; take: number }) { assert.deepEqual(args.where, ownedApplication(owner, true)); assert.equal(args.take, 2); return Array.from({ length: count }, () => ({ facility: { id: facilityId } })); } },
  facilityOpeningHours: {
   async findUnique(args: unknown) { assert.deepEqual(args, { where: { facilityId } }); return stored; },
   async upsert(args: { where: unknown; update: OpeningHours }) { assert.deepEqual(args.where, { facilityId }); stored = args.update; writes++; },
  },
  facilitySlot: {
   async findMany(args: { where: { facilityId: string; bookedAt?: unknown } }) { assert.equal(args.where.facilityId, facilityId); return args.where.bookedAt ? rows.filter(r => r.bookedAt) : rows; },
   async createMany(args: { skipDuplicates: boolean; data: { facilityId: string; startsAt: Date; endsAt: Date }[] }) {
    assert.equal(args.skipDuplicates, true); writes++;
    for (const data of args.data) { assert.equal(data.facilityId, facilityId); if (!rows.some(row => row.startsAt.getTime() === data.startsAt.getTime())) rows.push({ id: randomUUID(), ...data, bookedAt: null }); }
   },
   async deleteMany(args: unknown) { assert.deepEqual(args, { where: { facilityId, bookedAt: null, startsAt: { gte: now } } }); rows = rows.filter(row => row.bookedAt !== null || row.startsAt < now); },
  },
 };
 db.$transaction = (async (fn: (tx: typeof fake) => unknown, options: unknown) => { assert.deepEqual(options, { isolationLevel: 'Serializable', timeout: 15000 }); return fn(fake); }) as unknown as typeof db.$transaction;
 try {
  count = 0; await assert.rejects(accessOwnedSchedule(owner, { kind: 'get' }, now), { status: 404 }); assert.equal(writes, 0);
  count = 2; await assert.rejects(accessOwnedSchedule(owner, { kind: 'get' }, now), { status: 409 });
  count = 1; stored = null; await assert.rejects(accessOwnedSchedule(owner, { kind: 'get' }, now), { status: 404 }); stored = schedule('UTC');
  const op = { kind: 'slots' as const, range: { from: '2030-01-01', to: '2030-01-01' } };
  await accessOwnedSchedule(owner, op, now); await accessOwnedSchedule(owner, op, now); assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], booked);
  const closed = schedule('UTC'); closed.days.forEach(d => d.periods = []);
  await accessOwnedSchedule(owner, { kind: 'put', schedule: closed }, now); assert.deepEqual(rows, [booked]);
  await accessOwnedSchedule(owner, op, now); assert.deepEqual(rows, [booked]);
  await accessOwnedSchedule(owner, { kind: 'put', schedule: schedule('UTC','09:15','10:15') }, now);
  await accessOwnedSchedule(owner, op, now); assert.equal(rows.length, 2); assert.equal(rows[1]?.startsAt.toISOString(), '2030-01-01T09:45:00.000Z');
  for (const date of ['2029-12-31', '2031-01-02']) await assert.rejects(accessOwnedSchedule(owner, { kind: 'slots', range: { from: date, to: date } }, now), { status: 400 });
 } finally { db.$transaction = original; await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
 await assert.rejects(createOpeningHours(async () => { throw { code: 'P2034' }; })(owner, { kind: 'get' }), { status: 409 });
});

