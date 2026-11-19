import Link from 'next/link';
export default function ForbiddenPage() {
  return <section><h1>Access denied</h1><p>Your account does not have permission to view this page.</p><Link href="/sign-in">Sign in with another account</Link></section>;
}
