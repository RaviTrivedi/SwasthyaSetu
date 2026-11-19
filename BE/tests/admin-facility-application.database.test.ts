import { createAccountFixture } from './account-fixture.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { reviewApplication } from '../src/repositories/admin/facility-application.repository.js';

test('PostgreSQL permits exactly one concurrent application review', async () => {
  assert.equal(env.nodeEnv, 'development');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
  const db = getDatabase(), adminId = randomUUID(), applicantId = randomUUID(), id = randomUUID();
  try {
    for (const [userId, role] of [[adminId, 'ADMIN'], [applicantId, 'PATIENT']] as const) {
      await createAccountFixture({ id: userId, role: { connect: { name: role } }, firstName: 'Review fixture', email: `${userId}@example.invalid`, passwordHash: 'non-login-test-fixture' });
    }
    await db.facilityApplication.create({ data: { id, applicantId, facilityName: 'Fixture', facilityType: 'CLINIC', contactPersonName: 'Fixture', contactEmail: 'fixture@example.invalid', contactPhone: '+919876543210', address: 'Fixture', city: 'Fixture', services: ['Fixture'] } });
    const results = await Promise.all([
      reviewApplication(id, adminId, 'APPROVED', null),
      reviewApplication(id, adminId, 'REJECTED', 'Incomplete application'),
    ]);
    assert.equal(results.filter(result => result.outcome === 'reviewed').length, 1);
    assert.equal(results.filter(result => result.outcome === 'conflict').length, 1);
    const saved = await db.facilityApplication.findUniqueOrThrow({ where: { id } });
    assert.equal(saved.reviewedByAdminId, adminId); assert.ok(saved.reviewedAt);
    assert.equal(saved.rejectionReason, saved.status === 'REJECTED' ? 'Incomplete application' : null);
    // Arrange a rejected record and verify only one concurrent reopen succeeds.
    await db.facility.deleteMany({ where: { applicationId: id } });
    await db.facilityApplication.update({ where: { id }, data: {
      status: 'REJECTED', reviewedByAdminId: adminId, reviewedAt: saved.reviewedAt,
      rejectionReason: 'Original rejection',
    } });
    const reopened = await Promise.all([
      reviewApplication(id, adminId, 'PENDING', null),
      reviewApplication(id, adminId, 'PENDING', null),
    ]);
    assert.equal(reopened.filter(result => result.outcome === 'reviewed').length, 1);
    assert.equal(reopened.filter(result => result.outcome === 'conflict').length, 1);
    const pending = await db.facilityApplication.findUniqueOrThrow({ where: { id } });
    assert.equal(pending.status, 'PENDING');
    assert.equal(pending.rejectionReason, null);
    assert.equal(pending.reviewedAt, null);
    await reviewApplication(id, adminId, 'APPROVED', null);
    assert.equal((await reviewApplication(id, adminId, 'PENDING', null)).outcome, 'conflict');
  } finally {
    await db.facility.deleteMany({ where: { applicationId: id } });
    await db.facilityApplication.deleteMany({ where: { id } });
    await db.patient.deleteMany({ where: { id: applicantId } }); await db.admin.deleteMany({ where: { id: adminId } });
    await disconnectDatabase();
  }
});




