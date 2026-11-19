BEGIN;
LOCK TABLE "User", "Session", "FacilityApplication", "PasswordResetToken" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "User" u JOIN roles r ON r.id=u."roleId" WHERE r.name NOT IN ('PATIENT','ADMIN','DOCTOR','STAFF','ORGANIZATION')) THEN
  RAISE EXCEPTION 'Unsupported account role: map it before migrating';
 END IF;
 IF EXISTS (SELECT lower(btrim(email)) FROM "User" GROUP BY lower(btrim(email)) HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Resolve duplicate normalized emails before migrating';
 END IF;
END $$;
CREATE TABLE "Patient" (
 "id" UUID NOT NULL PRIMARY KEY, "firstName" VARCHAR(100) NOT NULL, "email" VARCHAR(254) NOT NULL UNIQUE,
 "passwordHash" TEXT NOT NULL, "roleId" INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "disabledAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL, "resetTokenHash" CHAR(64) UNIQUE, "resetExpiresAt" TIMESTAMPTZ(3)
);
INSERT INTO "Patient" (id,"firstName",email,"passwordHash","roleId","disabledAt","createdAt","updatedAt")
 SELECT u.id,u."firstName",lower(btrim(u.email)),u."passwordHash",(SELECT id FROM roles WHERE name='PATIENT'),u."disabledAt",u."createdAt",u."updatedAt"
 FROM "User" u JOIN roles r ON r.id=u."roleId" WHERE r.name IN ('PATIENT');
UPDATE "Patient" a SET "resetTokenHash"=t."tokenHash", "resetExpiresAt"=t."expiresAt"
 FROM (SELECT DISTINCT ON ("userId") "userId","tokenHash","expiresAt" FROM "PasswordResetToken"
 WHERE "usedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP ORDER BY "userId","createdAt" DESC,id DESC) t WHERE a.id=t."userId";
CREATE TABLE "Admin" (
 "id" UUID NOT NULL PRIMARY KEY, "firstName" VARCHAR(100) NOT NULL, "email" VARCHAR(254) NOT NULL UNIQUE,
 "passwordHash" TEXT NOT NULL, "roleId" INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "disabledAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL, "resetTokenHash" CHAR(64) UNIQUE, "resetExpiresAt" TIMESTAMPTZ(3)
);
INSERT INTO "Admin" (id,"firstName",email,"passwordHash","roleId","disabledAt","createdAt","updatedAt")
 SELECT u.id,u."firstName",lower(btrim(u.email)),u."passwordHash",(SELECT id FROM roles WHERE name='ADMIN'),u."disabledAt",u."createdAt",u."updatedAt"
 FROM "User" u JOIN roles r ON r.id=u."roleId" WHERE r.name IN ('ADMIN');
UPDATE "Admin" a SET "resetTokenHash"=t."tokenHash", "resetExpiresAt"=t."expiresAt"
 FROM (SELECT DISTINCT ON ("userId") "userId","tokenHash","expiresAt" FROM "PasswordResetToken"
 WHERE "usedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP ORDER BY "userId","createdAt" DESC,id DESC) t WHERE a.id=t."userId";
CREATE TABLE "Doctor" (
 "id" UUID NOT NULL PRIMARY KEY, "firstName" VARCHAR(100) NOT NULL, "email" VARCHAR(254) NOT NULL UNIQUE,
 "passwordHash" TEXT NOT NULL, "roleId" INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "disabledAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL, "resetTokenHash" CHAR(64) UNIQUE, "resetExpiresAt" TIMESTAMPTZ(3)
);
INSERT INTO "Doctor" (id,"firstName",email,"passwordHash","roleId","disabledAt","createdAt","updatedAt")
 SELECT u.id,u."firstName",lower(btrim(u.email)),u."passwordHash",(SELECT id FROM roles WHERE name='DOCTOR'),u."disabledAt",u."createdAt",u."updatedAt"
 FROM "User" u JOIN roles r ON r.id=u."roleId" WHERE r.name IN ('DOCTOR','STAFF','ORGANIZATION');
UPDATE "Doctor" a SET "resetTokenHash"=t."tokenHash", "resetExpiresAt"=t."expiresAt"
 FROM (SELECT DISTINCT ON ("userId") "userId","tokenHash","expiresAt" FROM "PasswordResetToken"
 WHERE "usedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP ORDER BY "userId","createdAt" DESC,id DESC) t WHERE a.id=t."userId";
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";
ALTER TABLE "FacilityApplication" DROP CONSTRAINT "FacilityApplication_applicantId_fkey";
ALTER TABLE "FacilityApplication" DROP CONSTRAINT "FacilityApplication_reviewedByAdminId_fkey";
ALTER TABLE "Session" ADD COLUMN "patientId" UUID REFERENCES "Patient"(id) ON DELETE CASCADE ON UPDATE CASCADE;
UPDATE "Session" s SET "patientId"=a.id FROM "Patient" a WHERE s."userId"=a.id;
ALTER TABLE "FacilityApplication" ADD COLUMN "applicantPatientId" UUID REFERENCES "Patient"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "FacilityApplication" f SET "applicantPatientId"=a.id FROM "Patient" a WHERE f."applicantId"=a.id;
ALTER TABLE "Session" ADD COLUMN "adminId" UUID REFERENCES "Admin"(id) ON DELETE CASCADE ON UPDATE CASCADE;
UPDATE "Session" s SET "adminId"=a.id FROM "Admin" a WHERE s."userId"=a.id;
ALTER TABLE "FacilityApplication" ADD COLUMN "applicantAdminId" UUID REFERENCES "Admin"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "FacilityApplication" f SET "applicantAdminId"=a.id FROM "Admin" a WHERE f."applicantId"=a.id;
ALTER TABLE "Session" ADD COLUMN "doctorId" UUID REFERENCES "Doctor"(id) ON DELETE CASCADE ON UPDATE CASCADE;
UPDATE "Session" s SET "doctorId"=a.id FROM "Doctor" a WHERE s."userId"=a.id;
ALTER TABLE "FacilityApplication" ADD COLUMN "applicantDoctorId" UUID REFERENCES "Doctor"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "FacilityApplication" f SET "applicantDoctorId"=a.id FROM "Doctor" a WHERE f."applicantId"=a.id;
ALTER TABLE "Session" ADD COLUMN "ipAddress" VARCHAR(45);
ALTER TABLE "Session" ADD CONSTRAINT "Session_one_owner" CHECK (num_nonnulls("patientId","adminId","doctorId")=1 AND "userId"=COALESCE("patientId","adminId","doctorId"));
ALTER TABLE "FacilityApplication" ADD CONSTRAINT "FacilityApplication_one_owner" CHECK (num_nonnulls("applicantPatientId","applicantAdminId","applicantDoctorId")=1 AND "applicantId"=COALESCE("applicantPatientId","applicantAdminId","applicantDoctorId"));
ALTER TABLE "FacilityApplication" ADD CONSTRAINT "FacilityApplication_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "Admin"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
DROP TABLE "PasswordResetToken";
DROP TABLE "FacilityApplicationReopening";
DROP TABLE "User";
DELETE FROM roles WHERE name IN ('STAFF','ORGANIZATION');
-- Account IDs/emails cannot be duplicated across account tables. The advisory
-- lock serializes identity writes; READ COMMITTED guarantees a fresh lookup
-- after a concurrent writer commits. Higher isolation identity writes fail safe.
CREATE FUNCTION enforce_account_identity() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
DECLARE expected_role text;
BEGIN
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'Identity writes require READ COMMITTED isolation' USING ERRCODE='25001';
 END IF;
 PERFORM pg_advisory_xact_lock(78421963001);
 NEW.email := lower(btrim(NEW.email));
 expected_role := upper(TG_TABLE_NAME);
 IF NOT EXISTS (SELECT 1 FROM roles WHERE id=NEW."roleId" AND name=expected_role) THEN
  RAISE EXCEPTION 'Invalid role for account table' USING ERRCODE='23514';
 END IF;
 IF EXISTS (
 SELECT 1 FROM (SELECT id,email,'Patient' AS kind FROM "Patient" UNION ALL SELECT id,email,'Admin' FROM "Admin" UNION ALL SELECT id,email,'Doctor' FROM "Doctor") a
 WHERE (a.email=NEW.email OR a.id=NEW.id) AND NOT (TG_OP='UPDATE' AND a.kind=TG_TABLE_NAME AND a.id=OLD.id)
 ) THEN RAISE EXCEPTION 'Account identity already exists' USING ERRCODE='23505', CONSTRAINT='platform_account_identity_unique'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Patient_identity" BEFORE INSERT OR UPDATE OF id,email,"roleId" ON "Patient" FOR EACH ROW EXECUTE FUNCTION enforce_account_identity();
CREATE TRIGGER "Admin_identity" BEFORE INSERT OR UPDATE OF id,email,"roleId" ON "Admin" FOR EACH ROW EXECUTE FUNCTION enforce_account_identity();
CREATE TRIGGER "Doctor_identity" BEFORE INSERT OR UPDATE OF id,email,"roleId" ON "Doctor" FOR EACH ROW EXECUTE FUNCTION enforce_account_identity();
-- Resolve the verified global ID to a real foreign key, even for direct SQL inserts.
CREATE FUNCTION resolve_account_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id uuid; p uuid; a uuid; d uuid;
BEGIN
 IF TG_TABLE_NAME='Session' THEN owner_id:=NEW."userId"; ELSE owner_id:=NEW."applicantId"; END IF;
 SELECT id INTO p FROM "Patient" WHERE id=owner_id;
 SELECT id INTO a FROM "Admin" WHERE id=owner_id;
 SELECT id INTO d FROM "Doctor" WHERE id=owner_id;
 IF num_nonnulls(p,a,d)<>1 THEN RAISE EXCEPTION 'Account owner does not exist' USING ERRCODE='23503'; END IF;
 IF TG_TABLE_NAME='Session' THEN NEW."patientId":=p; NEW."adminId":=a; NEW."doctorId":=d;
 ELSE NEW."applicantPatientId":=p; NEW."applicantAdminId":=a; NEW."applicantDoctorId":=d; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Session_owner" BEFORE INSERT OR UPDATE OF "userId","patientId","adminId","doctorId" ON "Session" FOR EACH ROW EXECUTE FUNCTION resolve_account_owner();
CREATE TRIGGER "FacilityApplication_owner" BEFORE INSERT OR UPDATE OF "applicantId","applicantPatientId","applicantAdminId","applicantDoctorId" ON "FacilityApplication" FOR EACH ROW EXECUTE FUNCTION resolve_account_owner();
COMMIT;
