import Link from "next/link";
import styles from "./FacilityNotFound.module.css";

export default function FacilityNotFound() {
  return (
    <section className={styles.message}>
      <h1>Facility not found</h1>
      <p>We couldn't find this clinic or hospital. Explore the search page to find another care option.</p>
      <Link href="/search">Back to search</Link>
    </section>
  );
}
