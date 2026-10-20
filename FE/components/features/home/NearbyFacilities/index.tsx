

import Link from "next/link";
import ProviderCard from "@/components/features/providers/ProviderCard";
import { facilities } from "./facilities";
import styles from "./NearbyFacilities.module.css";

export default function NearbyFacilities() {


  return (
    <section className={styles.section} aria-labelledby="nearby-facilities-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.location}>Near Ahmedabad</p>
          <h2 id="nearby-facilities-title">Nearby clinics and hospitals</h2>
        </div>
        <Link
          className={styles.viewAll}
          aria-label="View all nearby clinics and hospitals"
          href="/search?location=Ahmedabad"
        >
          View all <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className={styles.note}>Sample facilities and distances for preview only.</p>
      <ul className={styles.grid}>
        {facilities.map((facility) => (
          <li key={facility.id}>
            <ProviderCard
              facility={facility}
            />
          </li>
        ))}
      </ul>

    </section>
  );
}

