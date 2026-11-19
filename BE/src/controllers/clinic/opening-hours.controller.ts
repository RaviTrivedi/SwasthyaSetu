import type { RequestHandler } from "express";
import { getAuthentication } from "../../middleware/authenticate.js";
import { openingHours } from "../../services/clinic/opening-hours.service.js";
import {
  openingHoursSchema,
  slotQuerySchema,
} from "../../validation/clinic/opening-hours.schema.js";
import { HttpError } from "../../errors/http-error.js";
import { API_ERROR_MESSAGES as messages } from "../../constants/messages.js";
export function createOpeningHoursControllers(service = openingHours) {
  const get: RequestHandler = async (_req, res) => {
    res.json(await service(getAuthentication(res).userId, { kind: "get" }));
  };
  const put: RequestHandler = async (req, res) => {
    const input = openingHoursSchema.safeParse(req.body);
    if (!input.success)
      throw new HttpError(400, messages.INVALID_OPENING_HOURS);
    res.json(
      await service(getAuthentication(res).userId, {
        kind: "put",
        schedule: input.data,
      })
    );
  };
  const slots: RequestHandler = async (req, res) => {
    const input = slotQuerySchema.safeParse(req.query);
    if (!input.success) throw new HttpError(400, messages.INVALID_SLOT_RANGE);
    res.json(
      await service(getAuthentication(res).userId, {
        kind: "slots",
        range: input.data,
      })
    );
  };
  return { get, put, slots };
}
