import * as repository from "../../repositories/admin/facility-application.repository.js";
import { HttpError } from "../../errors/http-error.js";
import { API_ERROR_MESSAGES } from "../../constants/messages.js";
import type { ApplicationListInput } from "../../validation/admin/facility-application.schema.js";

type Operations = Pick<
  typeof repository,
  "listApplications" | "findApplication" | "reviewApplication"
>;
type Repository = {
  [K in keyof Operations]: (
    ...args: Parameters<Operations[K]>
  ) => Promise<Awaited<ReturnType<Operations[K]>>>;
};

export function createApplicationReview(data: Repository = repository) {
  return {
    list: (input: ApplicationListInput) => data.listApplications(input),
    async detail(id: string) {
      const application = await data.findApplication(id);
      if (!application) throw new HttpError(404, API_ERROR_MESSAGES.NOT_FOUND);
      return application;
    },
    async review(
      id: string,
      adminId: string,
      decision: "APPROVED" | "REJECTED" | "PENDING",
      reason: string | null
    ) {
      const result = await data.reviewApplication(
        id,
        adminId,
        decision,
        reason
      );
      if (result.outcome === "missing")
        throw new HttpError(404, API_ERROR_MESSAGES.NOT_FOUND);
      if (result.outcome === "conflict")
        throw new HttpError(
          409,
          decision === 'PENDING' ? API_ERROR_MESSAGES.APPLICATION_NOT_REJECTED : API_ERROR_MESSAGES.APPLICATION_ALREADY_REVIEWED
        );
      return result.application;
    },
  };
}
export const applicationReview = createApplicationReview();
export type ApplicationReview = typeof applicationReview;
