import { getDatabase } from '../config/database.js';
import { FacilityApplicationStatus } from '../generated/prisma/enums.js';
import type { FacilityApplicationInput } from '../validation/clinic/facility-application.schema.js';

export function createFacilityApplication(applicantId: string, input: FacilityApplicationInput) {
  return getDatabase().facilityApplication.create({
    select: {
      id: true, applicantId: true, facilityName: true, facilityType: true,
      contactPersonName: true, contactEmail: true, contactPhone: true, address: true,
      city: true, description: true, services: true, status: true, createdAt: true, updatedAt: true,
    },
    data: {
      ...input,
      description: input.description ?? null,
      applicantId,
      status: FacilityApplicationStatus.PENDING,
    },
  });
}
