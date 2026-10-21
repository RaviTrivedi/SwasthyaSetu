import type { Facility } from '@/components/features/providers/ProviderCard';

// Fictional preview data, independent of query parameters and local filters.
export const searchFacilities: readonly Facility[] = [
  {
    id: 'search-meadow-clinic',
    name: 'Meadow Family Clinic',
    type: 'Clinic',
    address: '12 Meadow Arcade, Navrangpura, Ahmedabad',
    distanceKm: 1.2,
    services: ['General Medicine', 'Preventive Care', 'Health Checkups'],
    appointmentInfo:
      'Sample hours: Mon–Sat, 9 am–1 pm. Requests require clinic approval.',
  },
  {
    id: 'search-riverleaf-hospital',
    name: 'Riverleaf Multispecialty Hospital',
    type: 'Hospital',
    address: '8 Riverleaf Avenue, Paldi, Ahmedabad',
    distanceKm: 2.8,
    services: ['Orthopedics', "Women's Health", 'Cardiology'],
    appointmentInfo:
      'Sample outpatient hours: Mon–Fri, 10 am–4 pm. Subject to approval.',
  },
  {
    id: 'search-clearbrook-clinic',
    name: 'Clearbrook Eye & Dental Clinic',
    type: 'Clinic',
    address: '21 Clearbrook Plaza, Satellite, Ahmedabad',
    distanceKm: 4.1,
    services: ['Eye Care', 'Dental Care', 'Vision Checks'],
    appointmentInfo:
      'Sample hours: Mon–Sat, 4 pm–7 pm. Requests require clinic approval.',
  },
  {
    id: 'search-willow-hospital',
    name: 'Willow Park Hospital',
    type: 'Hospital',
    address: '14 Willow Park Road, Vastrapur, Ahmedabad',
    distanceKm: 4.2,
    services: ["Women's Health", 'Pediatrics', 'ENT'],
  },
];
