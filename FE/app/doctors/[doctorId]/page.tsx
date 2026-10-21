import { notFound } from 'next/navigation';
import DoctorProfile from '@/components/features/doctors/DoctorProfile';
import {
  doctorProfileIds,
  getDoctorProfile,
} from '@/components/features/doctors/data/doctors';

export function generateStaticParams() {
  return doctorProfileIds.map((doctorId) => ({ doctorId }));
}

export default async function DoctorPage({
  params,
}: PageProps<'/doctors/[doctorId]'>) {
  const { doctorId } = await params;
  const doctor = getDoctorProfile(doctorId);
  if (!doctor) notFound();
  return <DoctorProfile doctor={doctor} />;
}
