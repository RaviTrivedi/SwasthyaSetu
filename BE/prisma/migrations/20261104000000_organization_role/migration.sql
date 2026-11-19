-- Add the clinic/hospital login role without changing existing users or permissions.
INSERT INTO "roles" ("name") VALUES ('ORGANIZATION') ON CONFLICT ("name") DO NOTHING;
