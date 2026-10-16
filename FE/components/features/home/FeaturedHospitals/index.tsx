"use client";

import { useState } from "react";
import ProviderCard from "@/components/features/providers/ProviderCard";
import { hospitals } from "./hospitals";
import styles from "./FeaturedHospitals.module.css";

export default function FeaturedHospitals() {
  const [message, setMessage] = useState("");

  return (
    <section className={styles.section} aria-labelledby="featured-hospitals-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Hospital care in Ahmedabad</p>
          <h2 id="featured-hospitals-title">Hospitals to explore</h2>
        </div>
        <button
          type="button"
          className={styles.viewAll}
          onClick={() => setMessage("Browsing all hospitals is coming soon.")}
        >
          View all hospitals <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className={styles.description}>
        Explore hospitals offering care across a range of specialties.
      </p>
      <p className={styles.note}>Fictional hospitals and sample distances for preview only.</p>
      <ul className={styles.grid}>
        {hospitals.map((hospital) => (
          <li key={hospital.id}>
            <ProviderCard
              facility={hospital}
              actionLabel="View hospital"
              onViewDetails={(selected) => setMessage(`Hospital details for ${selected.name} are coming soon.`)}
            />
          </li>
        ))}
      </ul>
      <p className={styles.status} role="status" aria-atomic="true">{message}</p>
    </section>
  );
}
