'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment, useRouter } from 'next/navigation';
import { logout } from './features/auth/api';
import { useSession } from './features/auth/use-session';
import { homeFor } from './features/auth/access-policy';
import { useEffect, useRef, useState } from 'react';
import styles from './site-header.module.css';

const navigation = [
  { href: '/search', label: 'Find care' },
  { href: '/search?query=Hospitals', label: 'Hospitals' },
  // { href: '/#specialty-categories-title', label: 'Specialties' },
];

export default function SiteHeader() {
  const segment = useSelectedLayoutSegment();
  const adminWorkspace = segment === 'admin';
  const [isOpen, setIsOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setIsOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function renderLinks() {
    return (
      <>
        <HeaderAccount
          adminWorkspace={adminWorkspace}
          onNavigate={() => setIsOpen(false)}
        />
      </>
    );
  }

  if (segment === 'sign-in' || segment === 'sign-up') {
    return null;
  }

  return (
    <header
      className={styles.header}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
          menuButton.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsOpen(false);
      }}
    >
      <div className={`container ${styles.inner}`}>
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span
            className={styles.menuIcon}
            data-open={isOpen}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </span>
        </button>
        <Link
          href={adminWorkspace ? '/admin' : '/'}
          className={styles.brand}
          aria-label="SwasthyaSetu home"
          onClick={() => setIsOpen(false)}
        >
          Swasthya<span>Setu</span>
        </Link>
        <nav
          className={styles.desktopNavigation}
          aria-label="Primary navigation"
        >
          {renderLinks()}
        </nav>
      </div>
      <div className={styles.mobilePanel} data-open={isOpen} inert={!isOpen}>
        <nav
          id="mobile-navigation"
          className={styles.mobileNavigation}
          aria-label="Primary navigation"
        >
          {renderLinks()}
        </nav>
      </div>
    </header>
  );
}

function HeaderAccount({
  onNavigate,
  adminWorkspace,
}: {
  onNavigate: () => void;
  adminWorkspace: boolean;
}) {
  const router = useRouter();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await logout();
      onNavigate();
      router.replace('/sign-in');
    } catch {
      setError('Unable to sign out. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (session.error)
    return (
      <button type="button" className={styles.signIn} onClick={session.retry}>
        Retry session check
      </button>
    );
  if (session.user === undefined)
    return (
      <span role="status" className={styles.sessionStatus}>
        Checking session...
      </span>
    );
  const marketplaceLinks =
    !adminWorkspace && session.user?.role !== 'ADMIN' ? (
      <ul className={styles.links}>
        {navigation.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} onClick={onNavigate}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    ) : null;
  if (!session.user)
    return (
      <>
        {marketplaceLinks}
        <Link href="/sign-in" className={styles.signIn} onClick={onNavigate}>
          Sign in
        </Link>
      </>
    );
  return (
    <>
      {marketplaceLinks}
      <div className={styles.account}>
        {session.user.role !== 'ADMIN' && (
          <Link
            href={
              session.user.role === 'PATIENT'
                ? '/appointments'
                : homeFor(session.user.role)
            }
            className={styles.signIn}
            onClick={onNavigate}
          >
            {session.user.role === 'DOCTOR'
              ? 'Doctor workspace'
              : 'My appointments'}
          </Link>
        )}
        {/* <span className={styles.accountName}>{session.user.firstName}</span> */}
        <button
          type="button"
          className={styles.signOut}
          disabled={busy}
          onClick={() => void signOut()}
        >
          {busy ? 'Signing out...' : 'Sign out'}
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
    </>
  );
}
