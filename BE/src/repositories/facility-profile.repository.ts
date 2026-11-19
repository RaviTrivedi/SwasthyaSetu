import { getDatabase } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { FacilityProfileInput } from '../validation/clinic/facility-profile.schema.js';
import type { FacilityApplicationInput } from '../validation/clinic/facility-application.schema.js';

export const serviceSelect = { id: true, name: true, createdAt: true, updatedAt: true } satisfies Prisma.FacilityServiceSelect;
export const profileSelect = {
  id: true, facilityName: true, facilityType: true, contactPersonName: true,
  contactEmail: true, contactPhone: true, address: true, city: true,
  description: true, services: { select: serviceSelect, orderBy: [{ position: 'asc' }, { id: 'asc' }] }, createdAt: true, updatedAt: true,
} satisfies Prisma.FacilitySelect;
type StoredProfile = Prisma.FacilityGetPayload<{ select: typeof profileSelect }>;
export const publicProfile = (profile: StoredProfile) => ({ ...profile, services: profile.services.map(service => service.name) });

export function ownedApplication(userId: string, doctorOnly = false): Prisma.FacilityApplicationWhereInput {
  return { applicantId: userId, status: 'APPROVED', ...(doctorOnly
    ? { applicantDoctorId: userId, applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } }
    : { OR: [{ applicantPatient: { disabledAt: null } }, { applicantAdmin: { disabledAt: null } }, { applicantDoctor: { disabledAt: null } }] }) };
}

// Keep IDs for retained names when the profile's complete service list is replaced.
export async function replaceServices(tx: Prisma.TransactionClient, facilityId: string, names: string[]) {
  const existing = await tx.facilityService.findMany({ where: { facilityId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  const retained: string[] = [];
  for (const [position, name] of names.entries()) {
    const row = existing.find(service => service.name === name && !retained.includes(service.id));
    if (row) {
      retained.push(row.id);
      await tx.facilityService.update({ where: { id: row.id, facilityId }, data: { position } });
    } else {
      const created = await tx.facilityService.create({ data: { facilityId, name, position } });
      retained.push(created.id);
    }
  }
  await tx.facilityService.deleteMany({ where: { facilityId, id: { notIn: retained } } });
}

export async function provisionOwnedProfile(userId: string, input: FacilityApplicationInput) {
  return getDatabase().$transaction(async tx => {
    const applications = await tx.facilityApplication.findMany({
      where: ownedApplication(userId), select: { id: true, facility: { select: { id: true } } }, take: 2,
    });
    if (applications.length > 1) return { outcome: 'multiple' } as const;
    const application = applications[0];
    if (!application) return { outcome: 'missing' } as const;
    if (application.facility) return { outcome: 'exists' } as const;
    const { services, ...fields } = input;
    const profile = await tx.facility.create({ data: { ...fields, description: input.description ?? null, applicationId: application.id,
      services: { create: services.map((name, position) => ({ name, position })) } }, select: profileSelect });
    return { outcome: 'created', profile: publicProfile(profile) } as const;
  }, { isolationLevel: 'Serializable' });
}

export async function accessOwnedProfile(userId: string, input?: FacilityProfileInput, doctorOnly = false) {
  return getDatabase().$transaction(async tx => {
    const where = ownedApplication(userId, doctorOnly);
    const applications = await tx.facilityApplication.findMany({ where, select: { id: true, facility: { select: profileSelect } }, take: 2 });
    if (applications.length > 1) return { outcome: 'multiple' } as const;
    const application = applications[0];
    if (!application?.facility) return { outcome: 'missing' } as const;
    if (!input) return { outcome: 'found', profile: publicProfile(application.facility) } as const;
    const { services, ...fields } = input;
    const data = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    const result = await tx.facility.updateMany({ where: { id: application.facility.id, application: where }, data: { ...data, updatedAt: new Date() } });
    if (result.count !== 1) return { outcome: 'missing' } as const;
    if (services) await replaceServices(tx, application.facility.id, services);
    const profile = await tx.facility.findUniqueOrThrow({ where: { id: application.facility.id }, select: profileSelect });
    return { outcome: 'found', profile: publicProfile(profile) } as const;
  }, { isolationLevel: 'Serializable' });
}
