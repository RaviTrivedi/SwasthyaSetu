import FacilityApplications from '@/components/features/admin/FacilityApplications';
// AdminAccess only renders this page after client-side session verification.
export const instant = false;
export default function ApplicationsPage() { return <FacilityApplications />; }
