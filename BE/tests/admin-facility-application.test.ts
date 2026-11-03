import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { createAdminApplicationRouter } from '../src/routes/admin/facility-application.routes.js';
import { createApplicationReview } from '../src/services/admin/facility-application.service.js';
import { createRequireAdmin } from '../src/middleware/require-admin.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { reviewSelect } from '../src/repositories/admin/facility-application.repository.js';
import { app } from '../src/app.js';

test('admin reviews enforce current privileges, validation, safe projections and pending transitions', async () => {
  const previous = process.env.ACCESS_TOKEN_SECRET;
  const key = randomBytes(32);
  process.env.ACCESS_TOKEN_SECRET = key.toString('hex');
  const adminId = randomUUID(), id = randomUUID(), applicantId = randomUUID();
  const admin = { id: adminId, firstName: 'Admin', email: 'admin@example.invalid', role: 'ADMIN' as 'ADMIN' | 'PATIENT', createdAt: new Date(), disabledAt: null as Date | null };
  const row = { id, applicantId, facilityName: 'Clinic', facilityType: 'CLINIC' as const,
    contactPersonName: 'Contact', contactEmail: 'contact@example.invalid', contactPhone: '+919876543210',
    address: 'Road', city: 'Pune', description: null, services: ['Consultation'],
    status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED', reviewedByAdminId: null as string | null,
    reviewedAt: null as Date | null, rejectionReason: null as string | null, createdAt: new Date(), updatedAt: new Date(),
    applicant: { id: applicantId, firstName: 'Applicant', email: 'applicant@example.invalid' } };
  let fail = false, calls = 0;
  const service = createApplicationReview({
    async listApplications(input) { calls++; if (fail) throw new Error('private database'); return { items: [row], total: 1, page: input.page, pageSize: input.pageSize }; },
    async findApplication(value) { calls++; return value === id ? row : null; },
    async reviewApplication(value, reviewer, status, reason) {
      calls++;
      if (value !== id) return { outcome: 'missing' };
      if (row.status !== (status === 'PENDING' ? 'REJECTED' : 'PENDING')) return { outcome: 'conflict' };
      Object.assign(row, { status, reviewedByAdminId: status === 'PENDING' ? null : reviewer, reviewedAt: status === 'PENDING' ? null : new Date(), rejectionReason: reason });
      return { outcome: 'reviewed', application: row };
    },
  });
  const authorize = createRequireAdmin(async userId => { assert.equal(userId, adminId); return admin; });
  const application = express();
  application.use('/api/v1/admin/facility-applications', createAdminApplicationRouter(service, authorize));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const sign = (role: string) => new SignJWT({ role }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(adminId).setIssuedAt().setExpirationTime('15m').sign(key);
  const token = await sign('ADMIN');
  const request = (path = '', method = 'GET', body?: unknown, bearer = token) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/admin/facility-applications${path}`, {
    method, headers: { 'X-CSRF-Protection': '1', Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    assert.equal((await request('', 'GET', undefined, '')).status, 401);
    const patient = await sign('PATIENT');
    for (const [path, method] of [['', 'GET'], [`/${id}`, 'GET'], [`/${id}/status`, 'PATCH']]) {
      assert.equal((await request(path, method, undefined, patient)).status, 403);
    }
    admin.role = 'PATIENT'; assert.equal((await request()).status, 403); admin.role = 'ADMIN';
    admin.disabledAt = new Date(); assert.equal((await request()).status, 403); admin.disabledAt = null;
    assert.equal(calls, 0);
    const list = await request('?page=2&pageSize=5&status=PENDING');
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), JSON.parse(JSON.stringify({ items: [row], total: 1, page: 2, pageSize: 5 })));
    assert.equal((await request(`/${id}`)).status, 200);
    for (const path of [`/${randomUUID()}`, `/${randomUUID()}/status`]) {
      const response = await request(path, path.endsWith('/status') ? 'PATCH' : 'GET', path.endsWith('/status') ? { status: 'REJECTED', rejectionReason: 'Missing information' } : undefined);
      assert.equal(response.status, 404); assert.deepEqual(await response.json(), { message: 'Not found' });
    }
    for (const query of ['?page=0', '?pageSize=101', '?status=OTHER', '?role=ADMIN', '?page=1&page=2']) assert.equal((await request(query)).status, 400);
    assert.equal((await request('/invalid-uuid')).status, 400);
    for (const body of [undefined, {}, { status: 'OTHER' }, { status: 'APPROVED', rejectionReason: 'Unexpected' }]) {
      assert.equal((await request(`/${id}/status`, 'PATCH', body)).status, 400);
    }
    for (const body of [{}, { rejectionReason: ' ' }, { rejectionReason: 'x'.repeat(2001) }, { rejectionReason: 'Reason', reviewerId: adminId }, { rejectionReason: 'Reason', status: 'PENDING' }]) {
      assert.equal((await request(`/${id}/status`, 'PATCH', { status: 'REJECTED', ...body })).status, 400);
    }
    assert.equal((await request(`/${id}/status`, 'PATCH', { status: 'APPROVED', reviewerId: adminId })).status, 400);
    const approved = await request(`/${id}/status?reviewerId=attacker`, 'PATCH', { status: 'APPROVED' });
    assert.equal(approved.status, 200);
    assert.equal(row.reviewedByAdminId, adminId); assert.equal(row.status, 'APPROVED'); assert.ok(row.reviewedAt);
    assert.equal((await request(`/${id}/status`, 'PATCH', { status: 'REJECTED', rejectionReason: 'Reason' })).status, 409);
    row.status = 'PENDING';
    const rejected = await request(`/${id}/status`, 'PATCH', { status: 'REJECTED', rejectionReason: '  Incomplete address  ' });
    assert.equal(rejected.status, 200); assert.equal(row.rejectionReason, 'Incomplete address'); assert.equal(row.status, 'REJECTED');
    assert.equal((await request(`/${id}/status`, 'PATCH', { status: 'APPROVED' })).status, 409);
    assert.equal((await request(`/${id}/status`, 'PATCH', { status: 'PENDING' })).status, 200);
    assert.equal(row.status, 'PENDING');
    assert.equal(row.reviewedByAdminId, null);
    assert.equal(row.rejectionReason, null);
    assert.equal((await request(`/${id}/status`, 'PATCH', { status: 'PENDING' })).status, 409);
    fail = true;
    const failed = await request(); assert.equal(failed.status, 500); assert.deepEqual(await failed.json(), { message: 'Internal server error' });
    assert.deepEqual(reviewSelect.applicant.select, { id: true, firstName: true, email: true });
    assert.equal('passwordHash' in reviewSelect, false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previous === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = previous;
  }
});

test('admin review routes are mounted behind authentication', async () => {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { assert.equal((await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/admin/facility-applications`)).status, 401); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
