import type { RequestHandler } from 'express';
import { getAuthentication } from '../../middleware/authenticate.js';
import { appointmentSchema } from '../../validation/patient/appointment.schema.js';
import { submitAppointment } from '../../services/patient/appointment.service.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
export function createAppointmentController(book = submitAppointment): RequestHandler {
  return async (req, res) => {
    const input = appointmentSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, API_ERROR_MESSAGES.INVALID_APPOINTMENT);
    res.status(201).json(await book(getAuthentication(res).userId, input.data));
  };
}
