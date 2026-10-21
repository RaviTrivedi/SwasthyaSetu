import {
  doctors,
  type FacilityDoctor,
} from '@/components/features/facilities/data/doctors';
import { workspaceFacility } from './workspace';

// Reuse existing profiles. This additional fictional profile is linked to another
// facility, but is available to link to the current workspace (not standalone).
export const affiliationDirectory: readonly FacilityDoctor[] = [
  ...doctors,
  {
    id: 'neha-trivedi',
    name: 'Dr. Neha Trivedi',
    specialty: 'General Medicine',
    credentials: 'MBBS, MD (General Medicine)',
    facilityIds: ['search-riverleaf-hospital'],
  },
];
export const initialAffiliatedDoctorIds = affiliationDirectory
  .filter((doctor) => doctor.facilityIds.includes(workspaceFacility.id))
  .map((doctor) => doctor.id);
