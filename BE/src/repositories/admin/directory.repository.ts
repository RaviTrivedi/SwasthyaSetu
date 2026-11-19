import { getDatabase } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { DoctorListInput, SlotListInput, UserListInput } from '../../validation/admin/directory.schema.js';

export const doctorSelect = {
  id: true, firstName: true, email: true, createdAt: true, disabledAt: true,
  role: { select: { name: true } },
  applications: { select: { id: true, facilityName: true, status: true,
    facility: { select: { id: true, facilityName: true, facilityType: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
} satisfies Prisma.DoctorSelect;

export async function listDoctors(input: DoctorListInput) {
  const where: Prisma.DoctorWhereInput = { role: { name: 'DOCTOR' },
    ...(input.applicationStatus ? { applications: { some: { status: input.applicationStatus } } } : {}) };
  const db = getDatabase();
  const [rows, total] = await db.$transaction([
    db.doctor.findMany({ where, select: doctorSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    db.doctor.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  return { items: rows.map(({ role, ...row }) => ({ ...row, role: role.name })), total, page: input.page, pageSize: input.pageSize };
}

type UserRow = { id: string; firstName: string; email: string; role: string; disabledAt: Date | null; createdAt: Date };
// A single SQL union gives globally ordered pagination across the three account tables.
// Identifiers are fixed here; query values remain bound parameters.
const users = Prisma.sql`
  SELECT u.id, u."firstName", u.email, r.name AS role, u."disabledAt", u."createdAt" FROM "Patient" u JOIN roles r ON r.id = u."roleId"
  UNION ALL SELECT u.id, u."firstName", u.email, r.name AS role, u."disabledAt", u."createdAt" FROM "Admin" u JOIN roles r ON r.id = u."roleId"
  UNION ALL SELECT u.id, u."firstName", u.email, r.name AS role, u."disabledAt", u."createdAt" FROM "Doctor" u JOIN roles r ON r.id = u."roleId"`;
export async function listUsers(input: UserListInput) {
  const filter = input.role ? Prisma.sql`WHERE role = ${input.role}` : Prisma.empty;
  return getDatabase().$transaction(async tx => {
    const items = await tx.$queryRaw<UserRow[]>(Prisma.sql`SELECT * FROM (${users}) accounts ${filter}
      ORDER BY "createdAt" DESC, id DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`);
    const [count] = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total FROM (${users}) accounts ${filter}`);
    return { items, total: Number(count!.total), page: input.page, pageSize: input.pageSize };
  }, { isolationLevel: 'RepeatableRead' });
}

export const slotSelect = {
  id: true, startsAt: true, endsAt: true, bookedAt: true,
  appointment: { select: { status: true } },
  facility: { select: { id: true, facilityName: true,
    openingHours: { select: { timezone: true } },
    application: { select: { status: true, applicantDoctor: { select: { disabledAt: true, role: { select: { name: true } } } } } } } },
} satisfies Prisma.FacilitySlotSelect;
export async function listSlots(input: SlotListInput) {
  const now = new Date();
  const booked: Prisma.FacilitySlotWhereInput = { OR: [{ bookedAt: { not: null } }, { appointment: { isNot: null } }] };
  const available: Prisma.FacilitySlotWhereInput = { bookedAt: null, appointment: { is: null }, startsAt: { gt: now },
    facility: { application: { status: 'APPROVED', applicantDoctor: { is: { disabledAt: null, role: { name: 'DOCTOR' } } } } } };
  const where: Prisma.FacilitySlotWhereInput = {
    ...(input.facilityId ? { facilityId: input.facilityId } : {}),
    startsAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lt: new Date(input.to) } : {}) },
    ...(input.status ? { AND: input.status === 'BOOKED' ? [booked] : input.status === 'AVAILABLE' ? [available] : [{ NOT: booked }, { NOT: available }] } : {}),
  };
  const db = getDatabase();
  const [rows, total] = await db.$transaction([
    db.facilitySlot.findMany({ where, select: slotSelect, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      skip: (input.page - 1) * input.pageSize, take: input.pageSize }), db.facilitySlot.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  const items = rows.map(row => {
    const owner = row.facility.application.applicantDoctor;
    const status = row.bookedAt || row.appointment ? 'BOOKED' : row.startsAt > now && row.facility.application.status === 'APPROVED' && owner && !owner.disabledAt && owner.role.name === 'DOCTOR' ? 'AVAILABLE' : 'UNAVAILABLE';
    return { id: row.id, startsAt: row.startsAt, endsAt: row.endsAt, status,
      appointmentStatus: row.appointment?.status ?? null,
      facility: { id: row.facility.id, facilityName: row.facility.facilityName, timezone: row.facility.openingHours?.timezone ?? null } };
  });
  return { items, total, page: input.page, pageSize: input.pageSize };
}
