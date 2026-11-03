import { getDatabase } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { FacilityProfileInput } from '../validation/clinic/facility-profile.schema.js';
import type { FacilityApplicationInput } from '../validation/clinic/facility-application.schema.js';

export async function provisionOwnedProfile(userId: string, input: FacilityApplicationInput) {
  return getDatabase().$transaction(async tx => {
    const applications = await tx.facilityApplication.findMany({
      where: { applicantId: userId, status: 'APPROVED', applicant: { disabledAt: null } },
      select: { id: true, facility: { select: { id: true } } }, take: 2,
    });
    if (applications.length > 1) return { outcome: 'multiple' } as const;
    const application = applications[0];
    if (!application) return { outcome: 'missing' } as const;
    if (application.facility) return { outcome: 'exists' } as const;
    const profile = await tx.facility.create({ data: { ...input, description: input.description ?? null, applicationId: application.id }, select: profileSelect });
    return { outcome: 'created', profile } as const;
  }, { isolationLevel: 'Serializable' });
}

export const profileSelect = {
  id: true, facilityName: true, facilityType: true, contactPersonName: true,
  contactEmail: true, contactPhone: true, address: true, city: true,
  description: true, services: true, createdAt: true, updatedAt: true,
} satisfies Prisma.FacilitySelect;

export async function accessOwnedProfile(userId: string, input?: FacilityProfileInput) {
  return getDatabase().$transaction(async tx => {
    const applications = await tx.facilityApplication.findMany({
      where: { applicantId: userId, status: 'APPROVED', applicant: { disabledAt: null } },
      select: { id: true, facility: { select: profileSelect } }, take: 2,
    });
    if (applications.length > 1) return { outcome: 'multiple' } as const;
    const application = applications[0];
    if (!application?.facility) return { outcome: 'missing' } as const;
    if (!input) return { outcome: 'found', profile: application.facility } as const;
    const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const result = await tx.facility.updateMany({
      where: { id: application.facility.id, application: { applicantId: userId, status: 'APPROVED', applicant: { disabledAt: null } } },
      data,
    });
    if (result.count !== 1) return { outcome: 'missing' } as const;
    const profile = await tx.facility.findUniqueOrThrow({ where: { id: application.facility.id }, select: profileSelect });
    return { outcome: 'found', profile } as const;
  }, { isolationLevel: 'Serializable' });
}

