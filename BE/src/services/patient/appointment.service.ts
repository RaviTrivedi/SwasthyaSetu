import { bookAppointment } from '../../repositories/patient/appointment.repository.js';
import type { AppointmentInput } from '../../validation/patient/appointment.schema.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
export function createBookAppointment(book = bookAppointment) {
  return async (patientId: string, input: AppointmentInput) => {
    try { return await book(patientId, input); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) {
        throw new HttpError(409, API_ERROR_MESSAGES.SLOT_UNAVAILABLE);
      }
      throw error;
    }
  };
}
export const submitAppointment = createBookAppointment();
