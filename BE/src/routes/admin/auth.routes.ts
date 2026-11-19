import { adminPasswordReset } from '../../services/admin/password-reset.service.js';
import { createResetRequestController, createResetConfirmController } from '../../controllers/patient/password-reset.controller.js';
import { Router, json } from 'express';
import { createLoginController } from '../../controllers/patient/login.controller.js';
import { loginAdmin } from '../../services/admin/login.service.js';
import { issueSession } from '../../services/patient/session.service.js';

export function createAdminAuthRouter(login = loginAdmin, issue = issueSession, reset = adminPasswordReset) {
  const router = Router();
  router.post(['/forgot-password', '/password-reset/request'], json({ limit: '16kb' }), createResetRequestController(reset));
  router.post(['/reset-password', '/password-reset/confirm'], json({ limit: '16kb' }), createResetConfirmController(reset));
  router.post('/login', json({ limit: '16kb' }), createLoginController(login, issue));
  // Refresh and logout use /api/v1/auth, matching the existing cookie Path.
  return router;
}
