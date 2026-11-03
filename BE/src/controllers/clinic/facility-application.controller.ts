import type { RequestHandler } from "express";
import { API_ERROR_MESSAGES } from "../../constants/messages.js";
import { HttpError } from "../../errors/http-error.js";
import { getAuthentication } from "../../middleware/authenticate.js";
import type { SubmitFacilityApplication } from "../../services/clinic/facility-application.service.js";
import { facilityApplicationSchema } from "../../validation/clinic/facility-application.schema.js";

export function createFacilityApplicationController(
  submit: SubmitFacilityApplication
): RequestHandler {
  return async (req, res) => {
    const { userId } = getAuthentication(res);
    const parsed = facilityApplicationSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(400, API_ERROR_MESSAGES.INVALID_FACILITY_APPLICATION);
    res.status(201).json(await submit(userId, parsed.data));
  };
}
