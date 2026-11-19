-- Keep PENDING for historical records. Commit before using BOOKED as a default.
ALTER TYPE "AppointmentStatus" ADD VALUE 'BOOKED';
