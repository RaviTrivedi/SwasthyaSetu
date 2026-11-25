import { getDatabase } from '../../config/database.js';
import { ownedApplication } from '../facility-profile.repository.js';
import type { AppointmentListInput } from '../../validation/clinic/appointment.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES as messages } from '../../constants/messages.js';

export const appointmentSelect = {
  id: true, status: true, appointmentNote: true, createdAt: true,
  patient: { select: { firstName: true } },
  slot: { select: { startsAt: true, endsAt: true } },
} satisfies Prisma.AppointmentSelect;

export async function listOwnedAppointments(ownerId: string, input: AppointmentListInput) {
  return getDatabase().$transaction(async tx => {
    const ownership = ownedApplication(ownerId, true);
    const applications = await tx.facilityApplication.findMany({ where: ownership, take: 2,
      select: { facility: { select: { id: true, openingHours: { select: { timezone: true } } } } } });
    if (applications.length > 1) throw new HttpError(409, messages.MULTIPLE_FACILITIES);
    const facility = applications[0]?.facility;
    if (!facility) throw new HttpError(404, messages.FACILITY_PROFILE_NOT_FOUND);
    const timezone = facility.openingHours?.timezone ?? 'UTC';
    // PostgreSQL applies the facility timezone, including DST, before comparing dates.
    const dated = input.date ? await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "FacilitySlot" WHERE "facilityId" = ${facility.id}::uuid
      AND ("startsAt" AT TIME ZONE ${timezone})::date = ${input.date}::date
    ` : undefined;
    const where: Prisma.AppointmentWhereInput = { slot: { facilityId: facility.id,
      facility: { application: ownership }, ...(dated ? { id: { in: dated.map(row => row.id) } } : {}) } };
    const items = await tx.appointment.findMany({ where, select: appointmentSelect,
      orderBy: [{ slot: { startsAt: 'desc' } }, { id: 'desc' }], skip: (input.page - 1) * input.pageSize, take: input.pageSize });
    const total = await tx.appointment.count({ where });
    return { items, total, page: input.page, pageSize: input.pageSize, timezone };
  }, { isolationLevel: 'RepeatableRead' });
}
