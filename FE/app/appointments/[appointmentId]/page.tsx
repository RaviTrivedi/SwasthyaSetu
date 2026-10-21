import { notFound } from 'next/navigation';
import AppointmentDetails from '@/components/features/appointments/AppointmentDetails';
import {
  getPatientAppointment,
  patientAppointments,
} from '@/components/features/appointments/data/appointments';

export const metadata = { title: 'Appointment details | SwasthyaSetu' };
export function generateStaticParams() {
  return patientAppointments.map(({ id }) => ({ appointmentId: id }));
}
export default async function AppointmentPage({
  params,
}: PageProps<'/appointments/[appointmentId]'>) {
  const { appointmentId } = await params;
  const appointment = getPatientAppointment(appointmentId);
  if (!appointment) notFound();
  return <AppointmentDetails appointment={appointment} />;
}
