import ApplicationDetail from '@/components/features/admin/FacilityApplications/Detail';
// AdminAccess only renders this page after client-side session verification.
export const instant = false;
export default async function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
 const { applicationId } = await params;
 return <ApplicationDetail key={applicationId} id={applicationId} />;
}
