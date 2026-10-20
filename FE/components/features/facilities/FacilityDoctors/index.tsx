import Link from "next/link";
import { getFacilityDoctors } from "../data/doctors";
import styles from "./FacilityDoctors.module.css";

export default function FacilityDoctors({ facilityId }: { facilityId: string }) {
  const doctors = getFacilityDoctors(facilityId);

  return (
    <section aria-labelledby="facility-doctors-title">
      <h2 id="facility-doctors-title">Doctors at this facility</h2>
      <p className={styles.note}>Fictional doctor profiles for this facility preview.</p>
      {doctors.length ? (
        <ul className={styles.grid}>
          {doctors.map((doctor) => (
            <li key={doctor.id}>
              <article className={styles.card}>
                <h3>{doctor.name}</h3>
                <p className={styles.specialty}>{doctor.specialty}</p>
                {doctor.credentials && <p className={styles.detail}>{doctor.credentials}</p>}
                {doctor.experienceYears !== undefined && (
                  <p className={styles.detail}>{doctor.experienceYears} years of experience</p>
                )}
                <Link href={`/doctors/${encodeURIComponent(doctor.id)}`} aria-label={`View profile for ${doctor.name}`}>View profile</Link>
              </article>
            </li>
          ))}
        </ul>
      ) : <p className={styles.note}>Doctor information is not available for this facility yet.</p>}
    </section>
  );
}
