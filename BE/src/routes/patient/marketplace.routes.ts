import { Router } from 'express';
import { createMarketplaceControllers } from '../../controllers/patient/marketplace.controller.js';
import { marketplace } from '../../services/patient/marketplace.service.js';
export function createMarketplaceRouter(service=marketplace) {
  const router=Router(), handlers=createMarketplaceControllers(service);
  router.get('/',handlers.list);
  router.get('/:facilityId/slots',handlers.slots);
  router.get('/:facilityId',handlers.detail);
  return router;
}
