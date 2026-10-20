

import Link from "next/link";
import styles from "./SpecialtyCategories.module.css";

const specialties = [
  { name: "General Medicine", marker: "GM" },
  { name: "Eye Care", marker: "EC" },
  { name: "Ear, Nose & Throat (ENT)", marker: "ENT" },
  { name: "Orthopedics", marker: "OR" },
  { name: "Women’s Health", marker: "WH" },
  { name: "Skin & Hair", marker: "SH" },
  { name: "Dental Care", marker: "DC" },
  { name: "Heart & Cardiology", marker: "HC" },
];

export default function SpecialtyCategories() {


  return (
    <section className={styles.section} aria-labelledby="specialty-categories-title">
      <h2 id="specialty-categories-title">Find care by specialty</h2>
      <p className={styles.intro}>Explore care for your everyday health needs.</p>
      <ul className={styles.grid}>
        {specialties.map(({ name, marker }) => (
          <li key={name}>
            <Link
              className={styles.card}
              href={`/search?${new URLSearchParams({ query: name })}`}
            >
              <span className={styles.marker} aria-hidden="true">{marker}</span>
              <span className={styles.name}>{name}</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>

    </section>
  );
}

