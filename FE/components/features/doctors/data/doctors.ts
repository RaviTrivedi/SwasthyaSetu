import { doctors } from "@/components/features/facilities/data/doctors";
import { getFacility, type FacilityDetails } from "@/components/features/facilities/data/facilities";

// Fictional introductions extend the shared facility doctor records.
const introductions: Record<string, string> = {
  "meera-vyas": "Dr. Meera Vyas focuses on general medicine and preventive health. Her approach emphasises listening to patients, explaining care options clearly, and supporting informed decisions about everyday health.",
  "arjun-desai": "Dr. Arjun Desai practises family medicine, supporting adults and families with their everyday health needs. He values clear communication, continuity of care, and practical health education.",
};

export function getDoctorProfile(doctorId: string) {
  const doctor = doctors.find((entry) => entry.id === doctorId);
  if (!doctor || !introductions[doctor.id]) return undefined;
  const affiliations = [...new Set(doctor.facilityIds)]
    .map(getFacility)
    .filter((facility): facility is FacilityDetails => Boolean(facility));
  if (affiliations.length === 0) return undefined;
  return { ...doctor, introduction: introductions[doctor.id], affiliations };
}

export const doctorProfileIds = doctors
  .filter((doctor) => Boolean(getDoctorProfile(doctor.id)))
  .map((doctor) => doctor.id);

export type DoctorProfileData = NonNullable<ReturnType<typeof getDoctorProfile>>;
