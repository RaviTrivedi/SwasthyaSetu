import type { Metadata } from 'next';
import AuthScreen from '@/components/features/auth/AuthScreen';
export const metadata: Metadata = {
  title: 'Admin Sign In | SwasthyaSetu',
  robots: { index: false, follow: false },
};
export default function AdminSignInPage() {
  return <AuthScreen mode="admin" />;
}
