// Fictional platform snapshot. No live facility or user records are loaded.
export const adminNavigation = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/facilities', label: 'Clinics & Hospitals' },
  { href: '/admin/doctors', label: 'Doctors' },
  { href: '/admin/slots', label: 'Appointment Slots' },
  { href: '/admin/users', label: 'Users & Roles' },
  { href: '/admin/audit', label: 'Audit Log' },
] as const;

export const adminSnapshot = {
  asOf: '2026-10-21T12:00:00+05:30',
  awaitingReview: 12,
  activeFacilities: 48,
  affiliatedDoctors: 186,
  upcomingSlots: 324,
  applications: [
    {
      id: 'application-104',
      name: 'Sahyadri Multispeciality Hospital and Advanced Care Centre',
      type: 'Hospital',
      location: 'Satellite Road, Ahmedabad, Gujarat',
      submittedAt: '2026-10-21T10:40:00+05:30',
      status: 'Awaiting review',
    },
    {
      id: 'application-103',
      name: 'Narmada Family Clinic',
      type: 'Clinic',
      location: 'Alkapuri, Vadodara, Gujarat',
      submittedAt: '2026-10-21T09:15:00+05:30',
      status: 'Awaiting review',
    },
    {
      id: 'application-102',
      name: 'Savera Women’s and Children’s Hospital',
      type: 'Hospital',
      location: 'Adajan, Surat, Gujarat',
      submittedAt: '2026-10-20T16:30:00+05:30',
      status: 'In review',
    },
    {
      id: 'application-101',
      name: 'Aarogya Community Clinic',
      type: 'Clinic',
      location: 'Raiya Road, Rajkot, Gujarat',
      submittedAt: '2026-10-20T11:10:00+05:30',
      status: 'Awaiting review',
    },
  ],
  activity: [
    {
      id: 'event-3',
      action: 'Facility application reviewed',
      detail:
        'Riya Shah reviewed the registration documents for Savera Women’s and Children’s Hospital.',
      at: '2026-10-21T11:20:00+05:30',
    },
    {
      id: 'event-2',
      action: 'Doctor affiliation verified',
      detail:
        'Aman Patel verified Dr. Kavita Joshi’s affiliation with Meadow Clinic.',
      at: '2026-10-21T10:05:00+05:30',
    },
    {
      id: 'event-1',
      action: 'Staff access updated',
      detail:
        'Riya Shah updated a facility coordinator’s role at Narmada Care Hospital.',
      at: '2026-10-20T17:45:00+05:30',
    },
  ],
};

export function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
