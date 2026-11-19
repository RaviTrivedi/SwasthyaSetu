import { z } from 'zod';
export const appointmentSchema = z.strictObject({
  slotId: z.uuid(),
  appointmentNote: z.string().trim().min(1).max(2000).optional(),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;
