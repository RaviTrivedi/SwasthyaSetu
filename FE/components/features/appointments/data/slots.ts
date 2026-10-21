import { getFacilityDoctors } from '@/components/features/facilities/data/doctors';

// Fictional availability; unavailable entries must never be selectable.
const slots = [
  {
    id: 'meera-1021-0930',
    facilityId: 'search-meadow-clinic',
    doctorId: 'meera-vyas',
    date: '2026-10-21',
    time: '09:30',
    feeINR: 600,
    available: true,
  },
  {
    id: 'meera-1021-1100',
    facilityId: 'search-meadow-clinic',
    doctorId: 'meera-vyas',
    date: '2026-10-21',
    time: '11:00',
    feeINR: 600,
    available: false,
  },
  {
    id: 'arjun-1021-1030',
    facilityId: 'search-meadow-clinic',
    doctorId: 'arjun-desai',
    date: '2026-10-21',
    time: '10:30',
    feeINR: null,
    available: true,
  },
  {
    id: 'meera-1022-1000',
    facilityId: 'search-meadow-clinic',
    doctorId: 'meera-vyas',
    date: '2026-10-22',
    time: '10:00',
    feeINR: 600,
    available: true,
  },
  {
    id: 'arjun-1023-1130',
    facilityId: 'search-meadow-clinic',
    doctorId: 'arjun-desai',
    date: '2026-10-23',
    time: '11:30',
    feeINR: null,
    available: true,
  },
];

export function getAppointmentSlots(facilityId: string, doctorOption: string) {
  const doctors = getFacilityDoctors(facilityId);
  return slots
    .filter(
      (slot) =>
        slot.available &&
        slot.facilityId === facilityId &&
        doctors.some((doctor) => doctor.id === slot.doctorId) &&
        (doctorOption === 'any' || slot.doctorId === doctorOption),
    )
    .map((slot) => ({
      ...slot,
      doctorName: doctors.find((doctor) => doctor.id === slot.doctorId)!.name,
    }))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export type FlowSlot = ReturnType<typeof getAppointmentSlots>[number];
export function formatSlotDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00+05:30`));
}
export function formatSlotTime(slot: FlowSlot) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(`${slot.date}T${slot.time}:00+05:30`));
}
