import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { env, requireDatabaseUrl } from '../config/env.js';
import { getDatabase, disconnectDatabase } from '../config/database.js';

// Local demonstration records only. Fixed IDs make reruns non-destructive.
const examples = [
  { name: 'Demo River Hospital', type: 'HOSPITAL' as const, city: 'Ahmedabad', services: ['General Medicine', 'Cardiology', 'Orthopedics'] },
  { name: 'Demo Garden Hospital', type: 'HOSPITAL' as const, city: 'Gandhinagar', services: ['Pediatrics', 'Eye Care', 'Dermatology'] },
  { name: 'Demo Community Clinic', type: 'CLINIC' as const, city: 'Ahmedabad', services: ['General Medicine', 'Dental Care'] },
];
try {
  const url = new URL(requireDatabaseUrl());
  if (env.nodeEnv !== 'development' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('LOCAL_ONLY');
  }
  const db = getDatabase();
  // Random passwords are never printed or retained; these are not demo login credentials.
  const passwordHash = await hash(randomBytes(48).toString('base64url'));
  await db.$transaction(async tx => {
    const role = await tx.role.upsert({ where: { name: 'DOCTOR' }, create: { name: 'DOCTOR' }, update: {} });
    for (const [index, example] of examples.entries()) {
      const suffix = String(index + 1).padStart(12, '0');
      const facilityId = `fede0000-0000-4000-8000-${suffix}`;
      if (await tx.facility.findUnique({ where: { id: facilityId }, select: { id: true } })) continue;
      const doctor = await tx.doctor.create({ data: {
        firstName: `Demo Facility Owner ${index + 1}`, email: `marketplace-demo-${index + 1}@example.invalid`, passwordHash, roleId: role.id,
      } });
      const fields = { facilityName: example.name, facilityType: example.type, contactPersonName: 'Demo Contact',
        contactEmail: `facility-demo-${index + 1}@example.invalid`, contactPhone: '+12025550100',
        address: `${index + 1} Example Road (fictional)`, city: example.city,
        description: 'Fictional development facility for testing. Not a real healthcare provider.' };
      const application = await tx.facilityApplication.create({ data: { ...fields, applicantId: doctor.id,
        applicantDoctorId: doctor.id, services: example.services, status: 'APPROVED', reviewedAt: new Date() } });
      await tx.facility.create({ data: { ...fields, id: facilityId, applicationId: application.id,
        services: { create: example.services.map((name, position) => ({ name, position })) },
        openingHours: { create: { timezone: 'Asia/Kolkata', days: Array.from({ length: 7 }, (_, day) => ({ day, periods: day === 0 ? [] : [{ open: '09:00', close: '17:00' }] })) } },
      } });
    }
  });
  console.log('Local demo facilities, services and opening hours are ready. Existing facilities were preserved.');
} catch (error) {
  console.error(error instanceof Error && error.message === 'LOCAL_ONLY'
    ? 'Demo seeding requires NODE_ENV=development and a localhost PostgreSQL database.'
    : 'Demo seeding failed; no partial changes were committed. Check database access, migrations and conflicting demo emails.');
  process.exitCode = 1;
} finally { await disconnectDatabase(); }
