export type FacilityDoctor = {
  id: string;
  facilityIds: readonly string[];
  name: string;
  specialty: string;
  credentials?: string;
  experienceYears?: number;
};

// Fictional profiles for the facility preview, not verified practitioner data.
export const doctors: readonly FacilityDoctor[] = [
  {
    id: 'meera-vyas',
    facilityIds: ['search-meadow-clinic'],
    name: 'Dr. Meera Vyas',
    specialty: 'General Medicine',
    credentials: 'MBBS, MD (General Medicine)',
    experienceYears: 12,
  },
  {
    id: 'arjun-desai',
    facilityIds: ['search-meadow-clinic'],
    name: 'Dr. Arjun Desai',
    specialty: 'Family Medicine',
    credentials: 'MBBS, DNB (Family Medicine)',
    experienceYears: 8,
  },
];

export function getFacilityDoctors(facilityId: string) {
  return doctors.filter((doctor) => doctor.facilityIds.includes(facilityId));
}
