import { Router, json } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { applicationReview } from "../../services/admin/facility-application.service.js";
import { createApplicationReviewControllers } from "../../controllers/admin/facility-application.controller.js";

export function createAdminApplicationRouter(
  service = applicationReview,
  authorize = requireAdmin
) {
  const router = Router();
  const handlers = createApplicationReviewControllers(service);
  router.use(authenticate, authorize);
  router.get("/", handlers.list);
  router.get("/:applicationId", handlers.detail);
  router.patch(
    "/:applicationId/status",
    json({ limit: "16kb" }),
    handlers.updateStatus
  );
  return router;
}
