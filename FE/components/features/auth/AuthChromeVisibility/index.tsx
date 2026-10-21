'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function AuthChromeVisibility({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (['/sign-in', '/sign-up'].includes(pathname)) return null;
  return <>{children}</>;
}
