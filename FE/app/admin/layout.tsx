import type { Metadata } from 'next';

import AdminShell from '@/components/features/admin/AdminShell';
import { AdminAccess } from '@/components/features/auth/AccessGate';

// Client-side cookie authentication intentionally withholds children during
// prerendering, so Next cannot validate this protected segment's instant shell.
export const instant = false;

export const metadata: Metadata = {
  title: 'Platform Admin | SwasthyaSetu',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AccessGate handles navigation; backend admin middleware remains the security boundary.
  return <AdminAccess><AdminShell>{children}</AdminShell></AdminAccess>;
}

