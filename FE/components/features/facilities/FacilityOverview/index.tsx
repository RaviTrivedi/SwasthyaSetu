"use client";

import Link from "next/link";
import type { FacilityDetails } from "../data/facilities";
import FacilityServices from "../FacilityServices";
import FacilityDoctors from "../FacilityDoctors";
import styles from "./FacilityOverview.module.css";

export default function FacilityOverview({
  facility,
}: {
  facility: FacilityDetails;
}) {

  return (
    <>
      {/* <Link href="/search" className={styles.back}>Back to search</Link> */}
      <header className={styles.header}>
        <p className={styles.type}>{facility.type}</p>
        <h1>{facility.name}</h1>
        <p className={styles.address}>{facility.address}</p>
        <p className={styles.preview}>
          Fictional facility · Sample information for preview only
        </p>
      </header>
      <div className={styles.layout}>
        <div className={styles.overview}>
          <section aria-labelledby="facility-about-title">
            <h2 id="facility-about-title">
              About {facility?.name}
            </h2>
            <p>{facility.description}</p>
          </section>
          <section aria-labelledby="facility-facts-title">
            <h2 id="facility-facts-title">At a glance</h2>
            <dl className={styles.facts}>
              <div>
                <dt>Operating hours</dt>
                <dd>{facility.hours}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{facility.address}</dd>
              </div>
            </dl>
          </section>
          <FacilityServices specialties={facility.specialties} />
          <FacilityDoctors facilityId={facility.id} />
        </div>
        <section
          className={styles.appointment}
          aria-labelledby="facility-appointment-title"
        >
          <h2 id="facility-appointment-title">Plan your visit</h2>
          <p>
            Appointment requests need approval from the care team before they
            are confirmed.
          </p>
          <Link className={styles.requestLink} href={`/appointments/new?facilityId=${encodeURIComponent(facility.id)}`}>
            Request appointment
          </Link>
        </section>
      </div>
    </>
  );
}
