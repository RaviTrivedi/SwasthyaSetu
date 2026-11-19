import type { RequestHandler } from "express";
import { getAuthentication } from "../../middleware/authenticate.js";
import {
  facilityServiceSchema,
  facilityServiceIdSchema,
} from "../../validation/clinic/facility-service.schema.js";
import { facilityServices } from "../../services/clinic/facility-service.service.js";
import { HttpError } from "../../errors/http-error.js";
import { API_ERROR_MESSAGES } from "../../constants/messages.js";
export function createFacilityServiceControllers(service = facilityServices) {
  const handler =
    (kind: "list" | "create" | "update" | "delete"): RequestHandler =>
    async (req, res) => {
      const id = facilityServiceIdSchema.safeParse(req.params.serviceId);
      const body = facilityServiceSchema.safeParse(req.body);
      if (
        ((kind === "update" || kind === "delete") && !id.success) ||
        ((kind === "create" || kind === "update") && !body.success)
      ) {
        throw new HttpError(400, API_ERROR_MESSAGES.INVALID_FACILITY_SERVICE);
      }
      const operation =
        kind === "list"
          ? ({ kind } as const)
          : kind === "create"
          ? ({ kind, name: body.data!.name } as const)
          : kind === "update"
          ? ({ kind, id: id.data!, name: body.data!.name } as const)
          : ({ kind, id: id.data! } as const);
      const result = await service(getAuthentication(res).userId, operation);
      if (result.outcome === "deleted") {
        res.status(204).end();
        return;
      }
      if (result.outcome === "listed") {
        res.json(result.services);
        return;
      }
      res.status(kind === "create" ? 201 : 200).json(result.service);
    };
  return {
    list: handler("list"),
    create: handler("create"),
    update: handler("update"),
    remove: handler("delete"),
  };
}
