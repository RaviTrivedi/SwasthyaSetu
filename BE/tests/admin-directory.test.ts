import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createAdminDirectoryRouter } from '../src/routes/admin/directory.routes.js';
import { createRequireAdmin } from '../src/middleware/require-admin.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { createAdminDirectory } from '../src/services/admin/directory.service.js';
import { doctorSelect, slotSelect, listDoctors, listSlots, listUsers } from '../src/repositories/admin/directory.repository.js';
import { app } from '../src/app.js';

test('all directory routes require a current Admin; validate queries and paginate', async () => {
  const previous = process.env.ACCESS_TOKEN_SECRET, key = randomBytes(32);
  process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
  const id = randomUUID(); let disabled = false, demoted = false, calls = 0;
  const service = createAdminDirectory({
    async listDoctors(input) { calls++; assert.equal(input.applicationStatus, 'APPROVED'); return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; },
    async listUsers(input) { calls++; assert.equal(input.role, 'DOCTOR'); return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; },
    async listSlots(input) { calls++; assert.equal(input.status, 'BOOKED'); return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; },
  });
  const authorize = createRequireAdmin(async () => ({ id, firstName: 'Admin', email: 'admin@example.invalid', role: demoted ? 'PATIENT' : 'ADMIN', disabledAt: disabled ? new Date() : null, createdAt: new Date() }));
  const application = express(); application.use('/api/v1/admin', createAdminDirectoryRouter(service, authorize)); application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
  const sign = (role: string) => new SignJWT({ role }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(id).setIssuedAt().setExpirationTime('15m').sign(key);
  const token = await sign('ADMIN');
  const request = (path: string, auth = token) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/admin/${path}`, { headers: { Cookie: auth ? `access_token=${auth}` : '' } });
  try {
    for (const path of ['doctors', 'users', 'appointment-slots']) {
      assert.equal((await request(path, '')).status, 401);
      for (const role of ['PATIENT', 'DOCTOR']) assert.equal((await request(path, await sign(role))).status, 403);
      disabled = true; assert.equal((await request(path)).status, 403); disabled = false;
      demoted = true; assert.equal((await request(path)).status, 403); demoted = false;
      for (const query of ['page=0', 'page=-1', 'page=1.2', 'pageSize=101', 'pageSize=0', 'page=1&page=2', 'secret=x']) assert.equal((await request(`${path}?${query}`)).status, 400);
    }
    for (const path of ['users?role=OWNER', 'doctors?applicationStatus=BAD', 'appointment-slots?status=PENDING', 'appointment-slots?facilityId=bad', 'appointment-slots?from=2030-01-01', 'appointment-slots?from=2030-01-02T00:00:00Z&to=2030-01-01T00:00:00Z']) assert.equal((await request(path)).status, 400);
    assert.equal(calls, 0);
    for (const path of ['doctors?applicationStatus=APPROVED', 'users?role=DOCTOR', 'appointment-slots?status=BOOKED']) {
      const response = await request(`${path}&page=2&pageSize=5`);
      assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { items: [], total: 0, page: 2, pageSize: 5 });
    }
    assert.equal(calls, 3);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous;
  }
});

test('directory repository uses safe selections, snapshot pagination and existing booking relationships', async () => {
  const { getDatabase, disconnectDatabase } = await import('../src/config/database.js');
  const previous = process.env.DATABASE_URL; process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
  const db = getDatabase(); const original = db.$transaction;
  const methods = { doctors: db.doctor.findMany, doctorCount: db.doctor.count, slots: db.facilitySlot.findMany, slotCount: db.facilitySlot.count };
  const doctor = { id: randomUUID(), firstName: 'Owner', email: 'owner@example.invalid', createdAt: new Date(), disabledAt: null, role: { name: 'DOCTOR' }, applications: [] };
  let slotQuery: unknown;
  const facility = { id: randomUUID(), facilityName: 'Clinic', openingHours: { timezone: 'Asia/Kolkata' }, application: { status: 'APPROVED', applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } } };
  const base = { id: randomUUID(), startsAt: new Date('2099-01-01T00:00:00Z'), endsAt: new Date('2099-01-01T00:30:00Z'), bookedAt: null, appointment: null, facility };
  db.doctor.findMany = (async (args: unknown) => { const query = args as { select: unknown; skip: number; take: number; where: unknown }; assert.deepEqual(query.select, doctorSelect); assert.equal(query.skip, 5); assert.equal(query.take, 5); assert.deepEqual(query.where, { role: { name: 'DOCTOR' }, applications: { some: { status: 'APPROVED' } } }); return [doctor]; }) as unknown as typeof db.doctor.findMany;
  db.doctor.count = (async () => 6) as typeof db.doctor.count;
  db.facilitySlot.findMany = (async (args: unknown) => { slotQuery = args; return [base, { ...base, appointment: { status: 'BOOKED' } }, { ...base, bookedAt: new Date() }, { ...base, startsAt: new Date(0) }, { ...base, facility: { ...facility, application: { ...facility.application, status: 'REJECTED' } } }]; }) as unknown as typeof db.facilitySlot.findMany;
  db.facilitySlot.count = (async () => 5) as typeof db.facilitySlot.count;
  let queries: { sql: string; values: unknown[] }[] = [];
  const tx = { async $queryRaw(query: { sql: string; values: unknown[] }) { queries.push(query); return query.sql.includes('count(*)') ? [{ total: 6n }] : [{ ...doctor, role: 'DOCTOR', applications: undefined }]; } };
  db.$transaction = (async (input: unknown, options: unknown) => { assert.deepEqual(options, { isolationLevel: 'RepeatableRead' }); return typeof input === 'function' ? input(tx) : Promise.all(input as Promise<unknown>[]); }) as typeof db.$transaction;
  try {
    const doctors = await listDoctors({ page: 2, pageSize: 5, applicationStatus: 'APPROVED' }); assert.equal(doctors.items[0]?.role, 'DOCTOR'); assert.equal(doctors.total, 6);
    const slots = await listSlots({ page: 1, pageSize: 20, status: 'BOOKED', facilityId: facility.id, from: '2030-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' });
    assert.deepEqual(slots.items.map(item => item.status), ['AVAILABLE', 'BOOKED', 'BOOKED', 'UNAVAILABLE', 'UNAVAILABLE']);
    assert.deepEqual(Object.keys(slots.items[0]!).sort(), ['appointmentStatus','endsAt','facility','id','startsAt','status']);
    assert.deepEqual((slotQuery as { select: unknown }).select, slotSelect);
    const where = (slotQuery as { where: { facilityId: string; AND: unknown; startsAt: unknown } }).where;
    assert.equal(where.facilityId, facility.id); assert.deepEqual(where.AND, [{ OR: [{ bookedAt: { not: null } }, { appointment: { isNot: null } }] }]);
    const users = await listUsers({ page: 2, pageSize: 5, role: 'DOCTOR' }); assert.equal(users.total, 6); assert.equal(queries.length, 2);
    assert.deepEqual(queries[0]!.values, ['DOCTOR', 5, 5]); assert.match(queries[0]!.sql, /UNION ALL/); assert.match(queries[0]!.sql, /ORDER BY "createdAt" DESC, id DESC/);
    assert.doesNotMatch(JSON.stringify({ doctorSelect, slotSelect, queries }), /passwordHash|resetTokenHash|resetExpiresAt|tokenHash|appointmentNote|patientId/);
    queries = []; await listUsers({ page: 1, pageSize: 20 }); assert.deepEqual(queries[0]!.values, [20, 0]);
  } finally {
    db.$transaction = original; db.doctor.findMany = methods.doctors; db.doctor.count = methods.doctorCount; db.facilitySlot.findMany = methods.slots; db.facilitySlot.count = methods.slotCount;
    await disconnectDatabase(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});

test('directory endpoints are registered behind authentication in the real app', async () => {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { for (const path of ['doctors', 'users', 'appointment-slots']) assert.equal((await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/admin/${path}`)).status, 401); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
