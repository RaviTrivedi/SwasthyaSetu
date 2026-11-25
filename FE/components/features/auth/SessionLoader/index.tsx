import styles from './SessionLoader.module.css';

export default function SessionLoader() {
  return (
    <div className={styles.container} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">Checking your session...</span>
    </div>
  );
}
