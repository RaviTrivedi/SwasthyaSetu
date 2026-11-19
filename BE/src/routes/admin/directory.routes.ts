import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { adminDirectory } from '../../services/admin/directory.service.js';
import { createAdminDirectoryControllers } from '../../controllers/admin/directory.controller.js';

export function createAdminDirectoryRouter(service = adminDirectory, authorize = requireAdmin) {
  const router = Router();
  const handlers = createAdminDirectoryControllers(service);
  router.get('/doctors', authenticate, authorize, handlers.doctors);
  router.get('/users', authenticate, authorize, handlers.users);
  router.get('/appointment-slots', authenticate, authorize, handlers.slots);
  return router;
}
