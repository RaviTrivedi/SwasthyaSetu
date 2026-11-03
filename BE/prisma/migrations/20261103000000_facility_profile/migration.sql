CREATE TABLE "Facility" (
  "id" UUID NOT NULL PRIMARY KEY,
  "applicationId" UUID NOT NULL,
  "facilityName" VARCHAR(200) NOT NULL,
  "facilityType" "FacilityType" NOT NULL,
  "contactPersonName" VARCHAR(100) NOT NULL,
  "contactEmail" VARCHAR(254) NOT NULL,
  "contactPhone" VARCHAR(16) NOT NULL,
  "address" VARCHAR(500) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "description" VARCHAR(2000),
  "services" TEXT[] NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Facility_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "FacilityApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Facility_applicationId_key" ON "Facility"("applicationId");
-- Reuse application UUIDs for backfilled profile IDs; no UUID extension required.
INSERT INTO "Facility" ("id", "applicationId", "facilityName", "facilityType", "contactPersonName", "contactEmail", "contactPhone", "address", "city", "description", "services", "createdAt", "updatedAt")
SELECT "id", "id", "facilityName", "facilityType", "contactPersonName", "contactEmail", "contactPhone", "address", "city", "description", "services", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "FacilityApplication" WHERE "status" = 'APPROVED';
