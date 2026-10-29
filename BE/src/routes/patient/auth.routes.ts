import { json, Router } from "express";
import { createRegisterController } from "../../controllers/patient/register.controller.js";
import { registerPatient } from "../../services/patient/register.service.js";
import { createLoginController } from "../../controllers/patient/login.controller.js";
import { loginPatient } from "../../services/patient/login.service.js";
import { issueSession } from "../../services/patient/session.service.js";
import { refreshSession } from "../../services/patient/refresh.service.js";
import { createRefreshController } from "../../controllers/patient/refresh.controller.js";
import { logoutSession } from "../../services/patient/logout.service.js";
import { createLogoutController } from "../../controllers/patient/logout.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { logoutAll } from "../../services/patient/logout-all.service.js";
import { createLogoutAllController } from "../../controllers/patient/logout-all.controller.js";
import { passwordReset } from '../../services/patient/password-reset.service.js';
import { createResetRequestController, createResetConfirmController } from '../../controllers/patient/password-reset.controller.js';

export function createPatientAuthRouter(
  register = registerPatient,
  login = loginPatient,
  issue = issueSession,
  refresh = refreshSession,
  logout = logoutSession
) {
  const router = Router();
  router.post('/password-reset/request', json({ limit: '16kb' }), createResetRequestController(passwordReset));
  router.post('/password-reset/confirm', json({ limit: '16kb' }), createResetConfirmController(passwordReset));
  router.post(
    "/register",
    json({ limit: "16kb" }),
    createRegisterController(register)
  );
  router.post(
    "/login",
    json({ limit: "16kb" }),
    createLoginController(login, issue)
  );
  router.post("/refresh", createRefreshController(refresh));
  router.post("/logout", createLogoutController(logout));
  router.post(
    "/logout-all",
    authenticate,
    createLogoutAllController(logoutAll)
  );
  return router;
}
