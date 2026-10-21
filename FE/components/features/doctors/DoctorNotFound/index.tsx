import Link from 'next/link';
import styles from './DoctorNotFound.module.css';

export default function DoctorNotFound() {
  return (
    <section className={styles.message}>
      <h1>Doctor profile unavailable</h1>
      <p>
        This profile could not be found or has no listed clinic or hospital
        affiliation.
      </p>
      <Link href="/search">Explore care options</Link>
    </section>
  );
}
