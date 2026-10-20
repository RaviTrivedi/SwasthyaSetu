export type AppointmentStatus = "Pending" | "Confirmed" | "Rejected" | "Cancelled" | "Completed";
export type PatientAppointment = {
  id: string;
  facilityId: string;
  facilityName: string;
  doctorName: string | null;
  service: string;
  startsAt: string;
  status: AppointmentStatus;
  period: "upcoming" | "past";
  patientName: string; bookingPhone: string; email?: string; consultationType: string;
};

// Fictional patient history, grouped relative to the demo date of 20 October 2026.
// TODO: Fetch the patient's requests from the backend and derive periods from
// appointment times and terminal statuses using the clinic's time zone.
const records: Omit<PatientAppointment, "patientName" | "bookingPhone" | "email" | "consultationType">[] = [
  { id: "demo-1", facilityId: "search-meadow-clinic", facilityName: "Meadow Family Clinic", doctorName: null, service: "General Medicine", startsAt: "2026-10-21T09:30:00+05:30", status: "Pending", period: "upcoming" },
  { id: "demo-2", facilityId: "search-meadow-clinic", facilityName: "Meadow Family Clinic", doctorName: "Dr. Arjun Desai", service: "Family Medicine", startsAt: "2026-10-23T11:30:00+05:30", status: "Confirmed", period: "upcoming" },
  { id: "demo-3", facilityId: "search-riverleaf-hospital", facilityName: "Riverleaf Multispecialty Hospital and Centre for Family Healthcare", doctorName: null, service: "Orthopedics", startsAt: "2026-10-14T10:00:00+05:30", status: "Rejected", period: "past" },
  { id: "demo-4", facilityId: "search-meadow-clinic", facilityName: "Meadow Family Clinic", doctorName: "Dr. Meera Vyas", service: "General Medicine", startsAt: "2026-10-10T09:30:00+05:30", status: "Cancelled", period: "past" },
  { id: "demo-5", facilityId: "search-meadow-clinic", facilityName: "Meadow Family Clinic", doctorName: "Dr. Meera Vyas", service: "Health checkup", startsAt: "2026-09-28T11:00:00+05:30", status: "Completed", period: "past" },
];

// Fictional booking contact details, shared by the demo patient's records.
export const patientAppointments: readonly PatientAppointment[] = records.map((record) => ({
  ...record, patientName: "Aarav Shah", bookingPhone: "+91 90000 00000",
  consultationType: "In-person consultation",
  ...(record.id === "demo-2" ? { email: "aarav@example.com" } : {}),
}));

export function getPatientAppointment(id: string) {
  // TODO: Fetch this request by ID from the backend with patient access checks.
  return patientAppointments.find((appointment) => appointment.id === id);
}
