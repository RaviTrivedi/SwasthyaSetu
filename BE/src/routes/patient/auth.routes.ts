import { createMeController } from "../../controllers/patient/me.controller.js";
import { getCurrentUser } from "../../services/patient/me.service.js";
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
import { passwordReset } from "../../services/patient/password-reset.service.js";
import {
  createResetRequestController,
  createResetConfirmController,
} from "../../controllers/patient/password-reset.controller.js";

/**
 * `json({ limit: "16kb" })` is Express middleware that:

1. Parses the incoming **JSON request body** into `req.body`.
2. Limits that body’s total size to **16 KB**.

For example, 
this registration data is usually well below the limit:

```json
{
  "name": "Ravi",
  "email": "ravi@example.com",
  "password": "your-password"
}
```

If the JSON body exceeds 16 KB, 
Express rejects the request with **`413 Payload Too Large`** 
before your registration controller runs.
This helps prevent unnecessarily large requests from consuming server resources. 
It limits the **whole JSON body**, not individual fields or the number of registrations.
 * 
 **/

// SETUP: create handlers and register them;
// controllers do not process a request yet.
// Default parameters use real services.
// Tests can inject substitutes for those services.
export function createPatientAuthRouter(
  register = registerPatient,
  login = loginPatient,
  issue = issueSession,
  refresh = refreshSession,
  logout = logoutSession,
  me = getCurrentUser
) {
  const router = Router();
  router.get("/me", authenticate, createMeController(me));
  router.post(
    "/password-reset/request",
    json({ limit: "16kb" }),
    createResetRequestController(passwordReset)
  );
  router.post(
    "/password-reset/confirm",
    json({ limit: "16kb" }),
    createResetConfirmController(passwordReset)
  );
  router.post(
    "/register",
    json({ limit: "16kb" }),
    createRegisterController(register)
  );
  // REQUEST: POST /api/v1/auth/login -> JSON parser -> login controller
  // -> login service verifies credentials -> session service persists a session
  // -> controller sets the cookie and sends JSON. Errors go to errorHandler.
  router.post(
    "/login",
    json({ limit: "16kb" }),
    createLoginController(login, issue)
  );
  // These handlers read the refresh cookie, so they do not need a JSON body parser.
  router.post("/refresh", createRefreshController(refresh));
  router.post("/logout", createLogoutController(logout));
  // authenticate must call next() successfully before this controller can run.
  // It supplies verified user identity; the controller ignores request-body IDs.
  router.post(
    "/logout-all",
    authenticate,
    createLogoutAllController(logoutAll)
  );
  return router;
}
