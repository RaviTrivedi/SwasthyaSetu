import { z } from "zod";
import { FacilityApplicationStatus } from "../../generated/prisma/enums.js";

const integer = (max: number) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max));
export const applicationListSchema = z.strictObject({
  page: integer(100000).default(1),
  pageSize: integer(100).default(20),
  status: z.enum(FacilityApplicationStatus).optional(),
});
export const applicationIdSchema = z.uuid();
export const updateApplicationStatusSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal(FacilityApplicationStatus.PENDING) }),
  z.strictObject({ status: z.literal(FacilityApplicationStatus.APPROVED) }),
  z.strictObject({
    status: z.literal(FacilityApplicationStatus.REJECTED),
    rejectionReason: z.string().trim().min(1).max(2000),
  }),
]);
export type ApplicationListInput = z.infer<typeof applicationListSchema>;
