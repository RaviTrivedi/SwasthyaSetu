import { listOwnedAppointments } from '../../repositories/clinic/appointment.repository.js';
import type { AppointmentListInput } from '../../validation/clinic/appointment.schema.js';
export function createDoctorAppointments(list = listOwnedAppointments) {
  return (ownerId: string, input: AppointmentListInput) => list(ownerId, input);
}
export const doctorAppointments = createDoctorAppointments();
