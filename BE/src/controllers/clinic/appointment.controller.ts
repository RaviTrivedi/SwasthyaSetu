import type { RequestHandler } from 'express';
import { doctorAppointments } from '../../services/clinic/appointment.service.js';
import { appointmentListSchema } from '../../validation/clinic/appointment.schema.js';
import { getAuthentication } from '../../middleware/authenticate.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
export function createDoctorAppointmentsController(list = doctorAppointments): RequestHandler {
  return async (req, res) => {
    const input = appointmentListSchema.safeParse(req.query);
    if (!input.success) throw new HttpError(400, API_ERROR_MESSAGES.INVALID_DOCTOR_APPOINTMENTS_QUERY);
    res.set('Cache-Control', 'no-store').json(await list(getAuthentication(res).userId, input.data));
  };
}
