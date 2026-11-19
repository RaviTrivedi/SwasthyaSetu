import { z } from 'zod';
import { Role } from '../../constants/roles.js';
import { FacilityApplicationStatus } from '../../generated/prisma/enums.js';

const integer = (max: number) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max));
const pagination = { page: integer(100000).default(1), pageSize: integer(100).default(20) };
export const doctorListSchema = z.strictObject({ ...pagination, applicationStatus: z.enum(FacilityApplicationStatus).optional() });
export const userListSchema = z.strictObject({ ...pagination, role: z.enum(Role).optional() });
export const slotListSchema = z.strictObject({
  ...pagination, facilityId: z.uuid().optional(),
  status: z.enum(['AVAILABLE', 'BOOKED', 'UNAVAILABLE']).optional(),
  from: z.iso.datetime({ offset: true }).optional(), to: z.iso.datetime({ offset: true }).optional(),
}).refine(value => !value.from || !value.to || Date.parse(value.from) < Date.parse(value.to));
export type DoctorListInput = z.infer<typeof doctorListSchema>;
export type UserListInput = z.infer<typeof userListSchema>;
export type SlotListInput = z.infer<typeof slotListSchema>;
