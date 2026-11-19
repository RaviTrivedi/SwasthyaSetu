'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import type { ReactNode } from 'react';

export default function AuthChromeVisibility({
  children,
}: {
  children: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  if (segment === 'sign-in' || segment === 'sign-up' || segment === 'admin') return null;
  return <>{children}</>;
}
