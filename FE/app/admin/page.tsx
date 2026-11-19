import AdminDashboard from '@/components/features/admin/AdminDashboard';

// Protected by the client-side AdminAccess guard; not a prerendered public shell.
export const instant = false;

export default function AdminPage() {
  return <AdminDashboard />;
}
