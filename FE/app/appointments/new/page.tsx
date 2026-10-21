import type { Metadata } from 'next';
import { Suspense } from 'react';
import AppointmentDoctorStep from '@/components/features/appointments/AppointmentDoctorStep';

export const metadata: Metadata = {
  title: 'Plan an appointment | SwasthyaSetu',
};

export default function NewAppointmentPage({
  searchParams,
}: PageProps<'/appointments/new'>) {
  return (
    <Suspense fallback={<p role="status">Loading your selected facility…</p>}>
      <AppointmentDoctorStep searchParams={searchParams} />
    </Suspense>
  );
}
