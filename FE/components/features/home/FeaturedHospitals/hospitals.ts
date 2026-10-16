import type { Facility } from "@/components/features/providers/ProviderCard";

// Fictional hospitals and illustrative distances for the Home preview.
export const hospitals = [
  {
    id: "cedar-grove-hospital",
    name: "Cedar Grove Hospital",
    type: "Hospital",
    address: "Bodakdev, Ahmedabad",
    distanceKm: 3.6,
    services: ["Cardiology", "Orthopedics", "General Medicine"],
  },
  {
    id: "willow-park-hospital",
    name: "Willow Park Hospital",
    type: "Hospital",
    address: "Vastrapur, Ahmedabad",
    distanceKm: 4.2,
    services: ["Women's Health", "Pediatrics", "ENT"],
  },
  {
    id: "maple-court-hospital",
    name: "Maple Court Hospital",
    type: "Hospital",
    address: "Thaltej, Ahmedabad",
    distanceKm: 5.7,
    services: ["Neurology", "Eye Care", "Dermatology"],
  },
] satisfies readonly Facility[];
