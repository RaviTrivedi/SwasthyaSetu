import type { Facility } from "@/components/features/providers/ProviderCard";

// Fictional sample facilities and distances, not live location-based results.
export const facilities: readonly Facility[] = [
  {
    id: "search-meadow-clinic",
    name: "Meadow Family Clinic",
    type: "Clinic",
    address: "12 Meadow Arcade, Navrangpura, Ahmedabad",
    distanceKm: 1.2,
    services: ["General Medicine", "Preventive Care", "Health Checkups"],
  },
  {
    id: "search-riverleaf-hospital",
    name: "Riverleaf Multispecialty Hospital",
    type: "Hospital",
    address: "8 Riverleaf Avenue, Paldi, Ahmedabad",
    distanceKm: 2.8,
    services: ["Orthopedics", "Women's Health", "Cardiology"],
  },
  {
    id: "search-clearbrook-clinic",
    name: "Clearbrook Eye & Dental Clinic",
    type: "Clinic",
    address: "21 Clearbrook Plaza, Satellite, Ahmedabad",
    distanceKm: 4.1,
    services: ["Eye Care", "Dental Care", "Vision Checks"],
  },
];
