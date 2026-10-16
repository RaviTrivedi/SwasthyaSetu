"use client";

import { useState } from "react";
import ProviderCard from "@/components/features/providers/ProviderCard";
import { facilities } from "./facilities";
import styles from "./NearbyFacilities.module.css";

export default function NearbyFacilities() {
  const [message, setMessage] = useState("");

  return (
    <section className={styles.section} aria-labelledby="nearby-facilities-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.location}>Near Ahmedabad</p>
          <h2 id="nearby-facilities-title">Nearby clinics and hospitals</h2>
        </div>
        <button
          type="button"
          className={styles.viewAll}
          aria-label="View all nearby clinics and hospitals"
          onClick={() => setMessage("Browsing all facilities is coming soon.")}
        >
          View all <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className={styles.note}>Sample facilities and distances for preview only.</p>
      <ul className={styles.grid}>
        {facilities.map((facility) => (
          <li key={facility.id}>
            <ProviderCard
              facility={facility}
              onViewDetails={(selected) => setMessage(`Details for ${selected.name} are coming soon.`)}
            />
          </li>
        ))}
      </ul>
      <p className={styles.status} role="status" aria-atomic="true">{message}</p>
    </section>
  );
}
