import { json, Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { createFacilityApplicationController } from "../../controllers/clinic/facility-application.controller.js";
import { submitFacilityApplication } from "../../services/clinic/facility-application.service.js";

export function createFacilityApplicationRouter(
  submit = submitFacilityApplication
) {
  const router = Router();
  router.post(
    "/applications",
    authenticate,
    json({ limit: "16kb" }),
    createFacilityApplicationController(submit)
  );
  return router;
}
