import { notFound } from 'next/navigation';
import AdminComingSoon from '@/components/features/admin/AdminComingSoon';
import { adminNavigation } from '@/components/features/admin/data/admin';

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = adminNavigation.find(
    (entry) => entry.href === `/admin/${section}`,
  );
  if (!item) notFound();
  return <AdminComingSoon title={item.label} />;
}
