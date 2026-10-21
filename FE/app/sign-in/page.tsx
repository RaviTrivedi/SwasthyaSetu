import type { Metadata } from 'next';
import AuthScreen from '@/components/features/auth/AuthScreen';
export const metadata: Metadata = { title: 'Sign In | SwasthyaSetu' };
export default function SignInPage() {
  return <AuthScreen mode="sign-in" />;
}
