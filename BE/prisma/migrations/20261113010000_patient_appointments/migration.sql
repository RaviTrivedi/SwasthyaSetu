CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING');
CREATE TABLE "Appointment" (
 "id" UUID PRIMARY KEY,
 "patientId" UUID NOT NULL REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "slotId" UUID NOT NULL REFERENCES "FacilitySlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "appointmentNote" VARCHAR(2000),
 "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");
