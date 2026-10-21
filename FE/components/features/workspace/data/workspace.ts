import { getFacilityDoctors } from '@/components/features/facilities/data/doctors';
import { getFacility } from '@/components/features/facilities/data/facilities';

export const workspaceFacility = getFacility('search-meadow-clinic')!;
export const workspaceDoctors = getFacilityDoctors(workspaceFacility.id);
export const demoToday = '2026-10-20';
// Fictional organization-scoped data. No patient records are fetched here.
const baseRequests = [
  {
    id: 'workspace-1',
    patient: 'Aarav Shah',
    doctor: null,
    startsAt: '2026-10-21T09:30:00+05:30',
    status: 'Pending',
  },
  {
    id: 'workspace-2',
    patient: 'Nisha Patel',
    doctor: 'Dr. Arjun Desai',
    startsAt: '2026-10-20T11:30:00+05:30',
    status: 'Confirmed',
  },
  {
    id: 'workspace-3',
    patient: 'Rohan Mehta',
    doctor: 'Dr. Meera Vyas',
    startsAt: '2026-10-22T10:00:00+05:30',
    status: 'Pending',
  },
] as const;

// Reserved within this app's development fixtures only. These intentionally
// invalid Indian mobile numbers must never be dialled or used for OTP delivery.
export const previewRoles = [
  { role: 'patient', label: 'Patient', phone: '+91 00000 00001' },
  {
    role: 'administrator',
    label: 'Clinic / hospital administrator',
    phone: '+91 00000 00002',
  },
  { role: 'doctor', label: 'Doctor', phone: '+91 00000 00003' },
  { role: 'platform-admin', label: 'Platform Admin', phone: '+91 00000 00004' },
] as const;
export type PreviewRole = (typeof previewRoles)[number]['role'];

export type WorkspaceRequest = {
  id: string;
  patient: string;
  doctor: string | null;
  startsAt: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  service: string;
  reason: string;
  phone: string;
  email?: string;
  createdAt: string;
  durationMinutes: number;
};
export const workspaceRequests: WorkspaceRequest[] = [
  ...baseRequests,
  {
    id: 'workspace-4',
    patient: 'Kavya Joshi',
    doctor: 'Dr. Arjun Desai',
    startsAt: '2026-10-20T11:30:00+05:30',
    status: 'Pending' as const,
  },
  {
    id: 'workspace-5',
    patient: 'Dev Shah',
    doctor: 'Dr. Meera Vyas',
    startsAt: '2026-10-19T10:00:00+05:30',
    status: 'Rejected' as const,
  },
].map((item) => ({
  ...item,
  service: 'General consultation',
  reason: 'Follow-up for ongoing care and discussion of recent symptoms.',
  phone: '+91 00000 00000',
  createdAt: '2026-10-18T14:00:00+05:30',
  durationMinutes: 30,
}));

export function hasRequestConflict(
  request: WorkspaceRequest,
  requests: readonly WorkspaceRequest[],
) {
  const start = Date.parse(request.startsAt);
  return requests.some(
    (other) =>
      other.id !== request.id &&
      other.status === 'Confirmed' &&
      // Until a doctor is assigned, conservatively block overlapping no-preference requests.
      (!request.doctor || !other.doctor || other.doctor === request.doctor) &&
      start < Date.parse(other.startsAt) + other.durationMinutes * 60000 &&
      Date.parse(other.startsAt) < start + request.durationMinutes * 60000,
  );
}
