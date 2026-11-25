import { z } from 'zod';
const integer = (max: number) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max));
export const appointmentListSchema = z.strictObject({
  page: integer(100000).default(1), pageSize: integer(100).default(20),
  date: z.iso.date().optional(),
});
export type AppointmentListInput = z.infer<typeof appointmentListSchema>;
