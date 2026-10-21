'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './site-header.module.css';

const navigation = [
  { href: '/search', label: 'Find care' },
  { href: '/search?query=Hospitals', label: 'Hospitals' },
  { href: '/#specialty-categories-title', label: 'Specialties' },
];

export default function SiteHeader() {
  const pathname = usePathname();
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
        <ul className={styles.links}>
          {navigation.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} onClick={() => setIsOpen(false)}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/sign-in"
          className={styles.signIn}
          onClick={() => setIsOpen(false)}
        >
          Sign in
        </Link>
      </>
    );
  }

  if (['/sign-in', '/sign-up'].includes(pathname)) {
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
          href="/"
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
