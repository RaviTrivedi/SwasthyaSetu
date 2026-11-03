import { Router } from 'express';
import { createFacilityProfileRouter } from './clinic/facility-profile.routes.js';
import { createAdminAuthRouter } from './admin/auth.routes.js';
import { createAdminApplicationRouter } from './admin/facility-application.routes.js';
import { createFacilityApplicationRouter } from './clinic/facility-application.routes.js';
import { healthRouter } from './health.routes.js';
import { createPatientAuthRouter } from './patient/auth.routes.js';

// app.ts mounts this router at /api/v1, so the paths below extend that prefix.
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
// createPatientAuthRouter() runs during setup and returns a configured router.
// Later requests to /api/v1/auth/... execute its matching route handlers.
apiRouter.use('/auth', createPatientAuthRouter());
apiRouter.use('/admin/auth', createAdminAuthRouter());
apiRouter.use('/facilities', createFacilityApplicationRouter());
apiRouter.use('/facilities', createFacilityProfileRouter());
apiRouter.use('/admin/facility-applications', createAdminApplicationRouter());
