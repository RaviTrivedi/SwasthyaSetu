import type { Prisma } from '../generated/prisma/client.js';
import { getDatabase } from '../config/database.js';
import { ownedApplication } from './facility-profile.repository.js';
import { openingHoursSchema, type OpeningHours, type SlotRange } from '../validation/clinic/opening-hours.schema.js';
import { generateSlots, localFormatter, localParts } from '../utils/slot-generation.js';
import { HttpError } from '../errors/http-error.js';
import { API_ERROR_MESSAGES as messages } from '../constants/messages.js';
export type ScheduleOperation = { kind: 'get' } | { kind: 'put'; schedule: OpeningHours } | { kind: 'slots'; range: SlotRange };
export async function accessOwnedSchedule(userId: string, operation: ScheduleOperation, now = new Date()) {
  return getDatabase().$transaction(async tx => {
    const applications = await tx.facilityApplication.findMany({ where: ownedApplication(userId, true), take: 2, select: { facility: { select: { id: true } } } });
    if (applications.length > 1) throw new HttpError(409, messages.MULTIPLE_FACILITIES);
    const facility = applications[0]?.facility;
    if (!facility) throw new HttpError(404, messages.FACILITY_PROFILE_NOT_FOUND);
    // Serialize schedule replacement and generation for this facility. Future booking writes must
    // lock this same row and atomically set bookedAt; clients cannot set that marker here.
    await tx.$queryRaw`SELECT "id" FROM "Facility" WHERE "id" = ${facility.id}::uuid FOR UPDATE`;
    const stored = await tx.facilityOpeningHours.findUnique({ where: { facilityId: facility.id } });
    if (operation.kind === 'put') {
      await tx.facilityOpeningHours.upsert({ where: { facilityId: facility.id }, create: { facilityId: facility.id, ...operation.schedule }, update: operation.schedule });
      // Existing bookings and historical slots survive even if their period/timezone is removed.
      await tx.facilitySlot.deleteMany({ where: { facilityId: facility.id, bookedAt: null, startsAt: { gte: now } } });
      return { timezone: operation.schedule.timezone, days: operation.schedule.days };
    }
    if (!stored) throw new HttpError(404, messages.OPENING_HOURS_NOT_FOUND);
    const schedule = openingHoursSchema.parse({ timezone: stored.timezone, days: stored.days });
    if (operation.kind === 'get') return schedule;
    return generateFacilitySlots(tx, facility.id, schedule, operation.range, now);
  }, { isolationLevel: 'Serializable', timeout: 15000 });
}


export async function generateFacilitySlots(tx: Prisma.TransactionClient, facilityId: string, schedule: OpeningHours, range: SlotRange, now: Date) {
    const formatter = localFormatter(schedule.timezone);
    const today = localParts(formatter, now).date;
    const horizon = new Date(Date.parse(today) + 365 * 86400000).toISOString().slice(0, 10);
    if (range.from < today || range.to > horizon) throw new HttpError(400, messages.INVALID_SLOT_RANGE);
    const generated = generateSlots(schedule, range, now);
    const bounds = { gte: new Date(Date.parse(range.from) - 86400000), lt: new Date(Date.parse(range.to) + 2 * 86400000) };
    const bookings = await tx.facilitySlot.findMany({ where: { facilityId: facilityId, bookedAt: { not: null }, startsAt: bounds }, select: { startsAt: true, endsAt: true } });
    // A changed period may shift the grid. Do not generate overlapping availability beside a booking.
    const available = generated.filter(slot => !bookings.some(b => slot.startsAt < b.endsAt && slot.endsAt > b.startsAt));
    await tx.facilitySlot.createMany({ data: available.map(slot => ({ facilityId: facilityId, ...slot })), skipDuplicates: true });
    const rows = await tx.facilitySlot.findMany({ where: { facilityId: facilityId, startsAt: { ...bounds, gte: new Date(Math.max(bounds.gte.getTime(), now.getTime())) } }, select: { id: true, startsAt: true, endsAt: true, bookedAt: true }, orderBy: { startsAt: 'asc' } });
    return { timezone: schedule.timezone, intervalMinutes: 30, slots: rows.filter(row => {
      const date = localParts(formatter, row.startsAt).date;
      return date >= range.from && date <= range.to;
    }).map(({ bookedAt, ...slot }) => ({ ...slot, booked: bookedAt !== null })) };
}
