import { Router, json } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { facilityProfile, provisionFacilityProfile } from '../../services/clinic/facility-profile.service.js';
import { createFacilityProfileControllers } from '../../controllers/clinic/facility-profile.controller.js';

export function createFacilityProfileRouter(profile = facilityProfile, provision = provisionFacilityProfile) {
  const router = Router();
  const handlers = createFacilityProfileControllers(profile, provision);
  router.post('/me', authenticate, json({ limit: '16kb' }), handlers.create);
  router.get('/me', authenticate, handlers.get);
  router.patch('/me', authenticate, json({ limit: '16kb' }), handlers.update);
  return router;
}
