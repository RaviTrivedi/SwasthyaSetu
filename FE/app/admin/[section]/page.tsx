import { notFound } from 'next/navigation';

// Sibling navigations are validated separately from the protected Admin layout.
export const instant = false;
import AdminComingSoon from '@/components/features/admin/AdminComingSoon';
import AdminDirectory from '@/components/features/admin/AdminDirectory';
import { adminNavigation, adminSectionAvailability, type UnavailableAdminSection } from '@/components/features/admin/data/admin';

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === 'doctors' || section === 'slots' || section === 'users') return <AdminDirectory key={section} section={section} />;
  const item = adminNavigation.find(
    (entry) => entry.href === `/admin/${section}`,
  );
  if (!item || !Object.hasOwn(adminSectionAvailability, section)) notFound();
  return <AdminComingSoon title={item.label} section={section as UnavailableAdminSection} />;
}
