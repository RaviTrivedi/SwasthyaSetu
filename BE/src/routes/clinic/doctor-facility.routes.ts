import { applicationAccessController } from '../../controllers/clinic/application-access.controller.js';
import { createDoctorAppointmentsController } from '../../controllers/clinic/appointment.controller.js';
import { doctorAppointments } from '../../services/clinic/appointment.service.js';
import { createOpeningHoursControllers } from '../../controllers/clinic/opening-hours.controller.js';
import { openingHours } from '../../services/clinic/opening-hours.service.js';
import { Router, json } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireDoctor } from '../../middleware/require-doctor.js';
import { createFacilityProfileControllers } from '../../controllers/clinic/facility-profile.controller.js';
import { createFacilityProfile } from '../../services/clinic/facility-profile.service.js';
import { accessOwnedProfile } from '../../repositories/facility-profile.repository.js';
import { createFacilityServiceControllers } from '../../controllers/clinic/facility-service.controller.js';
import { facilityServices } from '../../services/clinic/facility-service.service.js';

const doctorProfile = createFacilityProfile((id, input) => accessOwnedProfile(id, input, true));
export function createDoctorFacilityRouter(profile = doctorProfile, services = facilityServices, authorize = requireDoctor, schedule = openingHours, appointments = doctorAppointments) {
  const router = Router();
  router.use(authenticate, authorize);
  router.get('/appointments', createDoctorAppointmentsController(appointments));
  const profileHandlers = createFacilityProfileControllers(profile);
  const serviceHandlers = createFacilityServiceControllers(services);
  router.get('/application-status', applicationAccessController);
  router.get('/', profileHandlers.get);
  router.patch('/', json({ limit: '16kb' }), profileHandlers.update);
  router.get('/services', serviceHandlers.list);
  router.post('/services', json({ limit: '16kb' }), serviceHandlers.create);
  router.patch('/services/:serviceId', json({ limit: '16kb' }), serviceHandlers.update);
  router.delete('/services/:serviceId', serviceHandlers.remove);
  const hours = createOpeningHoursControllers(schedule);
  router.get('/opening-hours', hours.get);
  router.put('/opening-hours', json({ limit: '16kb' }), hours.put);
  router.get('/slots', hours.slots);
  return router;
}


