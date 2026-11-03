import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createFacilityApplicationRouter } from '../src/routes/clinic/facility-application.routes.js';
import { createSubmitFacilityApplication } from '../src/services/clinic/facility-application.service.js';
import { createFacilityApplication } from '../src/repositories/facility-application.repository.js';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { app } from '../src/app.js';

const input = { facilityName: ' Clinic ', facilityType: 'CLINIC' as const,
  contactPersonName: ' Contact ', contactEmail: ' CONTACT@Example.com ',
  contactPhone: ' +919876543210 ', address: ' Main Road ', city: ' Pune ',
  services: [' Consultation '], description: ' Description ' };
const normalized = { ...input, facilityName: 'Clinic', contactPersonName: 'Contact',
  contactEmail: 'contact@example.com', contactPhone: '+919876543210', address: 'Main Road',
  city: 'Pune', services: ['Consultation'], description: 'Description' };
const record = { ...normalized, id: randomUUID(), applicantId: randomUUID(), status: 'PENDING' as const,
  createdAt: new Date(), updatedAt: new Date() };

test('submission authenticates, validates, uses verified identity, and returns safe fields', async () => {
  const previous = process.env.ACCESS_TOKEN_SECRET;
  const secret = randomBytes(32).toString('hex');
  process.env.ACCESS_TOKEN_SECRET = secret;
  const calls: unknown[] = [];
  let fail = false;
  const submit = createSubmitFacilityApplication({ async createFacilityApplication(applicantId, fields) {
    calls.push({ applicantId, fields });
    if (fail) throw new Error('private database details');
    return { ...record, applicantId, ...fields, description: fields.description ?? null,
      passwordHash: 'private', applicant: { password: 'private' } };
  } });
  const application = express();
  application.use('/api/v1/facilities', createFacilityApplicationRouter(submit));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const token = await new SignJWT({ role: 'PATIENT' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(record.applicantId).setIssuedAt().setExpirationTime('15m').sign(Buffer.from(secret, 'hex'));
  const post = (body: unknown, authorization = `Bearer ${token}`) => fetch(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/facilities/applications?applicantId=attacker`,
    { method: 'POST', headers: { 'X-CSRF-Protection': '1', 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify(body) });
  try {
    for (const header of ['', 'Bearer invalid']) assert.equal((await post(input, header)).status, 401);
    assert.equal(calls.length, 0);
    const response = await post(input);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
    assert.deepEqual(calls, [{ applicantId: record.applicantId, fields: normalized }]);
    for (const override of [
      { facilityName: ' ' }, { facilityName: 'a'.repeat(201) }, { facilityType: 'OTHER' },
      { contactPersonName: '' }, { contactEmail: 'invalid' }, { contactPhone: '123' },
      { contactPhone: 919876543210 }, { address: '' }, { city: ' ' },
      { services: [] }, { services: 'Consultation' }, { services: [' '] }, { services: [1] },
      { services: Array(51).fill('x') }, { description: 'a'.repeat(2001) },
      { applicantId: randomUUID() }, { userId: randomUUID() }, { status: 'PENDING' },
      { approvedAt: new Date().toISOString() }, { facilityId: randomUUID() },
    ]) {
      const invalid = await post({ ...input, ...override });
      assert.equal(invalid.status, 400);
      assert.deepEqual(await invalid.json(), { message: 'Invalid facility application input' });
    }
    assert.equal((await post({})).status, 400);
    assert.equal(calls.length, 1);
    const { description: _description, ...withoutDescription } = input;
    const hospital = await post({ ...withoutDescription, facilityType: 'HOSPITAL' });
    assert.equal(hospital.status, 201);
    assert.equal((await hospital.json() as { description: null }).description, null);
    fail = true;
    const failed = await post(input);
    assert.equal(failed.status, 500);
    assert.deepEqual(await failed.json(), { message: 'Internal server error' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = previous;
  }
});

test('repository assigns applicant and PENDING even if unexpected internal fields are supplied', async t => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  try {
    // Prisma delegates use proxy methods that mock.method cannot discover.
    const delegate = getDatabase().facilityApplication;
    const original = delegate.create;
    const create = t.mock.fn(async (_args: Parameters<typeof original>[0]) => record);
    delegate.create = create as unknown as typeof original;
    t.after(() => { delegate.create = original; });
    await createFacilityApplication(record.applicantId, { ...normalized, applicantId: 'attacker', status: 'APPROVED' } as typeof normalized);
    const args = create.mock.calls[0]!.arguments[0]!;
    assert.equal(args.data.applicantId, record.applicantId);
    assert.equal(args.data.status, 'PENDING');
  } finally {
    t.mock.restoreAll();
    await disconnectDatabase();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test('application mounts facility submission behind authentication', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/facilities/applications`, { method: 'POST', headers: { 'X-CSRF-Protection': '1' } });
    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
