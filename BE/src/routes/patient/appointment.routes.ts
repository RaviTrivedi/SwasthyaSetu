import { Router, json } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePatient } from '../../middleware/require-patient.js';
import { createAppointmentController } from '../../controllers/patient/appointment.controller.js';
import { submitAppointment } from '../../services/patient/appointment.service.js';
export function createAppointmentRouter(book = submitAppointment, authorize = requirePatient) {
  const router = Router();
  router.post('/', authenticate, authorize, json({ limit: '16kb' }), createAppointmentController(book));
  return router;
}
