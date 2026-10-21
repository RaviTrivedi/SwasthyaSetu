export type FacilityDetails = {
  id: string;
  name: string;
  type: 'Clinic' | 'Hospital';
  address: string;
  description: string;
  hours: string;
  specialties: readonly string[];
};

// Fictional facility, using the same ID and details as the search preview.
const meadowClinic: FacilityDetails = {
  id: 'search-meadow-clinic',
  name: 'Meadow Family Clinic',
  type: 'Clinic',
  address: '12 Meadow Arcade, Navrangpura, Ahmedabad',
  description:
    'A neighbourhood clinic focused on everyday health needs. The care team offers general consultations, preventive care, and routine health checkups for adults and families.',
  hours: 'Monday–Saturday, 9 am–1 pm. Closed Sunday.',
  specialties: ['General Medicine', 'Preventive Care', 'Health Checkups'],
};

// Reuse listing facts so every card opens its own matching mock overview.
const listings = [
  ...new Map(
    [...hospitals, ...searchFacilities].map((facility) => [
      facility.id,
      facility,
    ]),
  ).values(),
];
export const facilities: readonly FacilityDetails[] = listings.map(
  (facility) =>
    facility.id === meadowClinic.id
      ? meadowClinic
      : {
          id: facility.id,
          name: facility.name,
          type: facility.type,
          address: facility.address,
          description: `${facility.name} is a fictional neighbourhood ${facility.type.toLowerCase()} in Ahmedabad offering ${facility.services.join(', ')}. Explore its services to plan your care.`,
          hours:
            'Sample hours: Monday–Saturday, 9 am–5 pm. Confirm hours with the care team before visiting.',
          specialties: facility.services,
        },
);

export function getFacility(facilityId: string) {
  return facilities.find((facility) => facility.id === facilityId);
}
import { searchFacilities } from '@/components/features/search/data/facilities';
import { hospitals } from '@/components/features/home/FeaturedHospitals/hospitals';
