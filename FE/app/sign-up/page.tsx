import type { Metadata } from 'next';
import AuthScreen from '@/components/features/auth/AuthScreen';
export const metadata: Metadata = { title: 'Sign Up | SwasthyaSetu' };
export default function SignUpPage() {
  return <AuthScreen mode="sign-up" />;
}
