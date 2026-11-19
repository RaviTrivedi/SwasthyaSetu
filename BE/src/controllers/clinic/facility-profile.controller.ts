import type { RequestHandler } from "express";
import { getAuthentication } from "../../middleware/authenticate.js";
import { facilityProfileSchema } from "../../validation/clinic/facility-profile.schema.js";
import type { FacilityProfile } from "../../services/clinic/facility-profile.service.js";
import { HttpError } from "../../errors/http-error.js";
import { API_ERROR_MESSAGES } from "../../constants/messages.js";
import { facilityApplicationSchema } from "../../validation/clinic/facility-application.schema.js";
import { provisionFacilityProfile } from "../../services/clinic/facility-profile.service.js";

export function createFacilityProfileControllers(
  profile: FacilityProfile,
  provision = provisionFacilityProfile
) {
  const create: RequestHandler = async (req, res) => {
    const parsed = facilityApplicationSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(400, API_ERROR_MESSAGES.INVALID_FACILITY_PROFILE);
    res
      .status(201)
      .json(await provision(getAuthentication(res).userId, parsed.data));
  };
  const get: RequestHandler = async (_req, res) => {
    res.json(await profile(getAuthentication(res).userId));
  };
  const update: RequestHandler = async (req, res) => {
    const parsed = facilityProfileSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(400, API_ERROR_MESSAGES.INVALID_FACILITY_PROFILE);
    res.json(await profile(getAuthentication(res).userId, parsed.data));
  };
  return { get, update, create };
}
