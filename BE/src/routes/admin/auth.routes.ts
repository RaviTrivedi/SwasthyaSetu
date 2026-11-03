import { Router, json } from 'express';
import { createLoginController } from '../../controllers/patient/login.controller.js';
import { loginAdmin } from '../../services/admin/login.service.js';
import { issueSession } from '../../services/patient/session.service.js';

export function createAdminAuthRouter(login = loginAdmin, issue = issueSession) {
  const router = Router();
  router.post('/login', json({ limit: '16kb' }), createLoginController(login, issue));
  // Refresh and logout use /api/v1/auth, matching the existing cookie Path.
  return router;
}
