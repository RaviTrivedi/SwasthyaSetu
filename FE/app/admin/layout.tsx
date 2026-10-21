import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/features/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Platform Admin | SwasthyaSetu',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Development availability is not authorization. TODO: Resolve the signed-in
  // admin and permissions on the server and enforce them in every backend query
  // before enabling this workspace outside development.
  if (process.env.NODE_ENV !== 'development') notFound();
  return <AdminShell>{children}</AdminShell>;
}
