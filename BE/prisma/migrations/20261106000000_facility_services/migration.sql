-- Preserve every service, including duplicate names and ordering, before removing the array.
CREATE TABLE "FacilityService" (
 "id" UUID NOT NULL PRIMARY KEY,
 "facilityId" UUID NOT NULL REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "name" VARCHAR(100) NOT NULL,
 "position" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "FacilityService_facilityId_idx" ON "FacilityService"("facilityId");
INSERT INTO "FacilityService" ("id", "facilityId", "name", "position", "updatedAt")
SELECT md5(f."id"::text || ':' || s.ordinality::text)::uuid, f."id", s.name, s.ordinality::integer - 1, CURRENT_TIMESTAMP
FROM "Facility" f CROSS JOIN LATERAL unnest(f."services") WITH ORDINALITY AS s(name, ordinality);
ALTER TABLE "Facility" DROP COLUMN "services";
