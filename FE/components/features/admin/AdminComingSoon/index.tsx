import Link from 'next/link';
import { adminSectionAvailability, type UnavailableAdminSection } from '../data/admin';
import styles from './AdminComingSoon.module.css';

export default function AdminComingSoon({ title, section }: { title: string; section: UnavailableAdminSection }) {
  const availability = adminSectionAvailability[section];
  return (
    <section className={styles.panel} aria-labelledby="admin-section-title">
      <h2 id="admin-section-title">{title}</h2>
      <h3>Not available yet</h3>
      <p>{availability.summary}</p>
      <p>{availability.detail}</p>
      <Link href={availability.link}>{availability.linkLabel}</Link>
    </section>
  );
}
