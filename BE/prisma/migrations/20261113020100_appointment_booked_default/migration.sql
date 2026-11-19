-- New appointments confirm immediately; existing records are not modified.
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'BOOKED'::"AppointmentStatus";
