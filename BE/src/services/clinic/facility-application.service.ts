import * as repository from "../../repositories/facility-application.repository.js";
import type { FacilityApplicationInput } from "../../validation/clinic/facility-application.schema.js";

interface Repository {
  createFacilityApplication(
    applicantId: string,
    input: FacilityApplicationInput
  ): Promise<Awaited<ReturnType<typeof repository.createFacilityApplication>>>;
}

export function createSubmitFacilityApplication(data: Repository = repository) {
  return async (applicantId: string, input: FacilityApplicationInput) => {
    const application = await data.createFacilityApplication(
      applicantId,
      input
    );
    // Explicit response fields prevent future relations or internal fields leaking.
    return {
      id: application.id,
      applicantId: application.applicantId,
      facilityName: application.facilityName,
      facilityType: application.facilityType,
      contactPersonName: application.contactPersonName,
      contactEmail: application.contactEmail,
      contactPhone: application.contactPhone,
      address: application.address,
      city: application.city,
      description: application.description,
      services: application.services,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  };
}

export const submitFacilityApplication = createSubmitFacilityApplication();
export type SubmitFacilityApplication = typeof submitFacilityApplication;
