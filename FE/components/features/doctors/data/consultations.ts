export type AppointmentSlot = {
  id: string;
  facilityId: string;
  startsAt: string;
};

export type ConsultationDetails = {
  services: readonly string[];
  languages: readonly string[];
  feeINR: number | null;
  slots: readonly AppointmentSlot[];
};

// Fictional consultation data. Times explicitly use Indian Standard Time.
export const consultations: Record<string, ConsultationDetails> = {
  'meera-vyas': {
    services: [
      'General consultation',
      'Preventive health consultation',
      'Follow-up consultation',
    ],
    languages: ['Gujarati', 'Hindi', 'English'],
    feeINR: 600,
    slots: [
      {
        id: 'meera-oct19-0930',
        facilityId: 'search-meadow-clinic',
        startsAt: '2026-10-19T09:30:00+05:30',
      },
      {
        id: 'meera-oct19-1100',
        facilityId: 'search-meadow-clinic',
        startsAt: '2026-10-19T11:00:00+05:30',
      },
      {
        id: 'meera-oct20-1000',
        facilityId: 'search-meadow-clinic',
        startsAt: '2026-10-20T10:00:00+05:30',
      },
    ],
  },
  'arjun-desai': {
    services: [
      'Family medicine consultation',
      'Preventive care',
      'Follow-up consultation',
    ],
    languages: ['Gujarati', 'Hindi', 'English'],
    feeINR: null,
    slots: [],
  },
};
