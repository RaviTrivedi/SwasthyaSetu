'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavigation } from '../data/admin';
import styles from './AdminShell.module.css';

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <>
      <header className={styles.header}>
        <p className={styles.eyebrow}>SwasthyaSetu · Platform workspace</p>
        <h1>Platform Admin</h1>
        <p>Facility oversight and marketplace operations.</p>
      </header>
      <aside className={styles.preview} aria-label="Development preview notice">
        <div>
          <strong>Development-only preview · Read-only</strong>
          <p>
            Fictional data. No signed-in admin or live permissions. A role
            selector or phone number does not authorize access.
          </p>
        </div>
        <Link href="/workspace">Switch preview role →</Link>
      </aside>
      <div className={styles.layout}>
        <nav className={styles.navigation} aria-label="Platform Admin">
          {adminNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </>
  );
}
