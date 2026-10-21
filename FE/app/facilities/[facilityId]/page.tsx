import { notFound } from 'next/navigation';
import FacilityOverview from '@/components/features/facilities/FacilityOverview';
import {
  facilities,
  getFacility,
} from '@/components/features/facilities/data/facilities';

export function generateStaticParams() {
  return facilities.map(({ id }) => ({ facilityId: id }));
}

export default async function FacilityPage({
  params,
}: PageProps<'/facilities/[facilityId]'>) {
  const { facilityId } = await params;
  const facility = getFacility(facilityId);
  if (!facility) notFound();
  return <FacilityOverview facility={facility} />;
}
