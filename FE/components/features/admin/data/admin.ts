export const adminNavigation = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/facilities', label: 'Facility Applications' },
  { href: '/admin/doctors', label: 'Doctors' },
  { href: '/admin/slots', label: 'Appointment Slots' },
  { href: '/admin/users', label: 'Users & Roles' },
  { href: '/admin/audit', label: 'Audit Log' },
] as const;

// Availability reflects inspected backend capabilities, not an empty query result.
export const adminSectionAvailability = {
  audit: {
    summary: 'Audit history is not available yet.',
    detail: 'Recorded platform audit events are not available for this view. Application review details can be viewed on individual facility applications; they are not a complete audit history.',
    link: '/admin/facilities', linkLabel: 'View facility applications',
  },
} as const;
export type UnavailableAdminSection = keyof typeof adminSectionAvailability;
