import Link from "next/link";
import type { DoctorProfileData } from "../data/doctors";
import styles from "./DoctorProfile.module.css";
import { consultations } from "../data/consultations";
import DoctorConsultation from "../DoctorConsultation";
import DoctorAppointments from "../DoctorAppointments";

export default function DoctorProfile({ doctor }: { doctor: DoctorProfileData }) {
  const consultation = consultations[doctor.id];
  return (
    <>
      <header className={styles.header}>
        <p className={styles.specialty}>{doctor.specialty}</p>
        <h1>{doctor.name}</h1>
        <dl className={styles.facts}>
          {doctor.credentials && <div><dt>Credentials</dt><dd>{doctor.credentials}</dd></div>}
          {doctor.experienceYears !== undefined && <div><dt>Experience</dt><dd>{doctor.experienceYears} years</dd></div>}
        </dl>
        <p className={styles.note}>Fictional doctor profile for preview only.</p>
      </header>
      <div className={styles.layout}>
        <section aria-labelledby="doctor-about-title">
          <h2 id="doctor-about-title">About the doctor</h2>
          <p className={styles.introduction}>{doctor.introduction}</p>
        </section>
        <section aria-labelledby="doctor-affiliations-title">
          <h2 id="doctor-affiliations-title">Affiliation and location</h2>
          <ul className={styles.affiliations}>
            {doctor.affiliations.map((facility) => (
              <li key={facility.id}>
                <article className={styles.card}>
                  <p className={styles.type}>{facility.type}</p>
                  <h3>{facility.name}</h3>
                  <p className={styles.address}>{facility.address}</p>
                  <Link href={`/facilities/${encodeURIComponent(facility.id)}`} className={styles.link}
                    aria-label={`View facility details for ${facility.name}`}>View facility details</Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {consultation && <DoctorConsultation consultation={consultation} />}
      <DoctorAppointments key={doctor.id} slots={consultation?.slots ?? []} affiliations={doctor.affiliations} />
    </>
  );
}
