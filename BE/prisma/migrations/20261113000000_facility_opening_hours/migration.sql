CREATE TABLE "FacilityOpeningHours" (
 "facilityId" UUID PRIMARY KEY REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "timezone" VARCHAR(100) NOT NULL,
 "days" JSONB NOT NULL,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE TABLE "FacilitySlot" (
 "id" UUID PRIMARY KEY,
 "facilityId" UUID NOT NULL REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "startsAt" TIMESTAMPTZ(3) NOT NULL,
 "endsAt" TIMESTAMPTZ(3) NOT NULL,
 "bookedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FacilitySlot_duration_check" CHECK ("endsAt" = "startsAt" + INTERVAL '30 minutes')
);
CREATE UNIQUE INDEX "FacilitySlot_facilityId_startsAt_key" ON "FacilitySlot"("facilityId", "startsAt");
