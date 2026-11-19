import { getDatabase } from '../../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { MarketplaceQuery } from '../../validation/patient/marketplace.schema.js';
import { openingHoursSchema } from '../../validation/clinic/opening-hours.schema.js';
import { generateFacilitySlots } from '../opening-hours.repository.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES as messages } from '../../constants/messages.js';

export const publishedFacility = { application: { status: 'APPROVED', applicantDoctor: { is: { disabledAt: null, role: { name: 'DOCTOR' } } } } } satisfies Prisma.FacilityWhereInput;
export const marketplaceSelect = { id: true, facilityName: true, facilityType: true, address: true, city: true, description: true,
  services: { select: { name: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }] }, openingHours: { select: { timezone: true } } } satisfies Prisma.FacilitySelect;
function publicProfile(row: Prisma.FacilityGetPayload<{ select: typeof marketplaceSelect }>) {
  const { openingHours, services, ...profile } = row;
  return { ...profile, services: services.map(service => service.name), timezone: openingHours?.timezone ?? null };
}
export async function listFacilities(input: MarketplaceQuery) {
  const where: Prisma.FacilityWhereInput = { ...publishedFacility,
    ...(input.query ? { facilityName: { contains: input.query, mode: 'insensitive' } } : {}),
    ...(input.city ? { city: { contains: input.city, mode: 'insensitive' } } : {}), ...(input.facilityType ? { facilityType: input.facilityType } : {}) };
  const db = getDatabase(); const [rows,total] = await db.$transaction([
    db.facility.findMany({ where, select: marketplaceSelect, skip: (input.page-1)*input.pageSize, take: input.pageSize, orderBy: [{facilityName:'asc'},{id:'asc'}] }), db.facility.count({where}),
  ], {isolationLevel:'RepeatableRead'});
  return { items: rows.map(publicProfile), total, page: input.page, pageSize: input.pageSize };
}
export async function findFacility(id: string) {
  const row = await getDatabase().facility.findFirst({ where: { id, ...publishedFacility }, select: marketplaceSelect });
  if (!row) throw new HttpError(404,messages.NOT_FOUND);
  return publicProfile(row);
}
export async function facilityAvailability(id: string, date: string) {
  return getDatabase().$transaction(async tx => {
    // Same facility lock as schedule editing and booking. Approval stays stable
    // while generating slots, and ownership/auth rules for Doctor APIs stay intact.
    await tx.$queryRaw`SELECT "id" FROM "Facility" WHERE "id" = ${id}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT a."id" FROM "FacilityApplication" a JOIN "Facility" f ON f."applicationId" = a."id" WHERE f."id" = ${id}::uuid FOR SHARE OF a`;
    const facility = await tx.facility.findFirst({ where: { id, ...publishedFacility }, select: { openingHours: { select: { timezone: true, days: true } } } });
    if (!facility) throw new HttpError(404,messages.NOT_FOUND);
    if (!facility.openingHours) return { timezone: null, intervalMinutes: 30, slots: [] };
    const schedule = openingHoursSchema.parse(facility.openingHours);
    return generateFacilitySlots(tx,id,schedule,{from:date,to:date},new Date());
  }, {isolationLevel:'Serializable',timeout:15000});
}
