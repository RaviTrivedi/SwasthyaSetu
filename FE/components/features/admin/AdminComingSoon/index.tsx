import Link from 'next/link';
import styles from './AdminComingSoon.module.css';

export default function AdminComingSoon({ title }: { title: string }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      <h3>Coming soon</h3>
      <p>
        This area is planned for a future step. The current admin preview is
        read-only.
      </p>
      <Link href="/admin">Back to dashboard →</Link>
    </section>
  );
}
