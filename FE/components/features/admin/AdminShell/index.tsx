'use client';

import Link from 'next/link';
import { memo, Suspense } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { adminNavigation } from '../data/admin';
import styles from './AdminShell.module.css';

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className={styles.header}>
        <p className={styles.eyebrow}>SwasthyaSetu Â· Platform workspace</p>
        <h1>Platform Admin</h1>
        <p>Facility oversight and marketplace operations.</p>
      </header>

      <div className={styles.layout}>
        <AdminNavigation />
        <div className={styles.content}><Suspense fallback={<p role="status">Loading Admin content...</p>}>{children}</Suspense></div>
      </div>
    </>
  );
}

const AdminNavigation = memo(function AdminNavigation() {
  // Subscribe only to the Admin layout's immediate section. Dynamic detail IDs
  // and query changes must not suspend or replace the persistent sidebar.
  const section = useSelectedLayoutSegment();
  const pathname = section ? `/admin/${section}` : '/admin';
  return <nav className={styles.navigation} aria-label="Platform Admin">
          {adminNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              aria-current={(pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'))) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>;
});

