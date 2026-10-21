import type { Metadata } from 'next';
import MyAppointments from '@/components/features/appointments/MyAppointments';

export const metadata: Metadata = { title: 'My appointments | SwasthyaSetu' };

export default function AppointmentsPage() {
  return <MyAppointments />;
}
