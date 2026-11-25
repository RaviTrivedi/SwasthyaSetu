import { getDatabase } from '../../config/database.js';
import type { AppointmentInput } from '../../validation/patient/appointment.schema.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES as messages } from '../../constants/messages.js';

export async function bookAppointment(patientId: string, input: AppointmentInput) {
  return getDatabase().$transaction(async tx => {
    const patient = await tx.patient.findFirst({ where: { id: patientId, disabledAt: null, role: { name: 'PATIENT' } }, select: { id: true } });
    if (!patient) throw new HttpError(403, messages.PATIENT_REQUIRED);
    const candidate = await tx.facilitySlot.findUnique({ where: { id: input.slotId }, select: { facilityId: true } });
    if (!candidate) throw new HttpError(409, messages.SLOT_UNAVAILABLE);
    // Match opening-hours locking so a schedule replacement cannot remove a slot during booking.
    await tx.$queryRaw`SELECT "id" FROM "Facility" WHERE "id" = ${candidate.facilityId}::uuid FOR UPDATE`;
    // Hold approval stable until commit, using the same application row admin review updates.
    await tx.$queryRaw`SELECT a."id" FROM "FacilityApplication" a JOIN "Facility" f ON f."applicationId" = a."id" WHERE f."id" = ${candidate.facilityId}::uuid FOR SHARE OF a`;
    // Capture time after lock waits; a slot that started while waiting is unavailable.
    const now = new Date();
    // This UPDATE is the claim, not a read-then-write availability check. A competing
    // transaction sees bookedAt set and cannot proceed to appointment creation.
    const reserved = await tx.facilitySlot.updateMany({
      where: { id: input.slotId, facilityId: candidate.facilityId, bookedAt: null, appointment: null, startsAt: { gt: now },
        facility: { application: { status: 'APPROVED', applicantDoctor: { disabledAt: null, role: { name: 'DOCTOR' } } } } },
      data: { bookedAt: now },
    });
    if (reserved.count !== 1) throw new HttpError(409, messages.SLOT_UNAVAILABLE);
    // A unique slotId is a second database guard. Any failure rolls the reservation back.
    const appointment = await tx.appointment.create({
      data: { patientId, slotId: input.slotId, appointmentNote: input.appointmentNote ?? null, status: 'BOOKED' },
      select: { id: true, status: true, createdAt: true, slot: { select: { startsAt: true, endsAt: true,
        facility: { select: { id: true, facilityName: true, facilityType: true, address: true, city: true, openingHours: { select: { timezone: true } } } } } } },
    });
    const { openingHours, ...facility } = appointment.slot.facility;
    return { id: appointment.id, status: appointment.status, createdAt: appointment.createdAt,
      facility: { ...facility, timezone: openingHours?.timezone ?? null },
      slot: { startsAt: appointment.slot.startsAt, endsAt: appointment.slot.endsAt } };
  }, { isolationLevel: 'ReadCommitted' });
}


