import { doctorPasswordReset } from '../../services/clinic/password-reset.service.js';
import { createResetRequestController, createResetConfirmController } from '../../controllers/patient/password-reset.controller.js';
import { Router, json } from 'express';
import { createRegisterController } from '../../controllers/patient/register.controller.js';
import { createLoginController } from '../../controllers/patient/login.controller.js';
import { registerDoctor, loginDoctor } from '../../services/clinic/auth.service.js';
import { issueSession } from '../../services/patient/session.service.js';

export function createClinicAuthRouter(register = registerDoctor, login = loginDoctor, issue = issueSession, reset = doctorPasswordReset) {
  const router = Router();
  router.post(['/forgot-password', '/password-reset/request'], json({ limit: '16kb' }), createResetRequestController(reset));
  router.post(['/reset-password', '/password-reset/confirm'], json({ limit: '16kb' }), createResetConfirmController(reset));
  router.post('/register', json({ limit: '16kb' }), createRegisterController(register));
  router.post('/login', json({ limit: '16kb' }), createLoginController(login, issue));
  // Existing /auth/refresh and /auth/logout share the same session and cookie paths.
  return router;
}
