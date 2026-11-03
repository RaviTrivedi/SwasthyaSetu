import type { RequestHandler } from "express";
import { z } from "zod";
import {
  applicationIdSchema,
  applicationListSchema,
  updateApplicationStatusSchema,
} from "../../validation/admin/facility-application.schema.js";
import { getAuthentication } from "../../middleware/authenticate.js";
import { HttpError } from "../../errors/http-error.js";
import { API_ERROR_MESSAGES } from "../../constants/messages.js";
import type { ApplicationReview } from "../../services/admin/facility-application.service.js";

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new HttpError(400, API_ERROR_MESSAGES.INVALID_APPLICATION_REVIEW);
  return result.data;
}
export function createApplicationReviewControllers(service: ApplicationReview) {
  const list: RequestHandler = async (req, res) => {
    res.json(await service.list(parse(applicationListSchema, req.query)));
  };
  const detail: RequestHandler = async (req, res) => {
    res.json(
      await service.detail(parse(applicationIdSchema, req.params.applicationId))
    );
  };
  const updateStatus: RequestHandler = async (req, res) => {
    const id = parse(applicationIdSchema, req.params.applicationId);
    const input = parse(updateApplicationStatusSchema, req.body);

    const reason = input.status === "REJECTED" ? input.rejectionReason : null;
    res.json(
      await service.review(
        id,
        getAuthentication(res).userId,
        input.status,
        reason
      )
    );
  };
  return { list, detail, updateStatus };
}
