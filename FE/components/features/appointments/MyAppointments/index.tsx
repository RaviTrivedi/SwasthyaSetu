"use client";

import Link from "next/link";
import { useState } from "react";
import { patientAppointments } from "../data/appointments";
import PatientAppointmentCard from "../PatientAppointmentCard";
import styles from "./MyAppointments.module.css";

type ViewState = "appointments" | "loading" | "empty" | "error";

export default function MyAppointments() {
  const [state, setState] = useState<ViewState>("appointments");
  return <>
    <header className={styles.header}>
      <h1>My appointments</h1>
      <p>Review your requests and visits. Pending requests need clinic approval before they become confirmed appointments.</p>
      <p className={styles.note}>Fictional sample history as of 20 October 2026. Requests from the demo booking flow are not saved here.</p>
    </header>
    {process.env.NODE_ENV === "development" && <div className={styles.preview}>
      <label htmlFor="appointments-preview">Development preview</label>
      <select id="appointments-preview" value={state} onChange={(event) => setState(event.target.value as ViewState)}>
        <option value="appointments">Appointments</option><option value="loading">Loading</option><option value="empty">Empty</option><option value="error">Error</option>
      </select>
    </div>}
    {state === "loading" ? <section aria-busy="true" className={styles.section}>
      <p role="status">Loading your appointments...</p>
      <div className={styles.grid} aria-hidden="true">{[0, 1].map((id) => <div className={styles.skeleton} key={id}><span /><span /><span /></div>)}</div>
    </section> : state === "error" ? <section className={styles.section}>
      <div role="alert"><h2>We couldn’t load your appointments</h2><p>Please try again in a moment.</p></div>
      <button className={styles.action} type="button" onClick={() => {
        // TODO: Retry the patient appointments query when backend fetching is connected.
        setState("appointments");
      }}>Try again</button>
    </section> : state === "empty" || patientAppointments.length === 0 ? <section className={styles.section}>
      <h2>No appointments yet</h2><p>Explore nearby clinics and hospitals to find care that suits you.</p>
      <Link href="/search" className={styles.action}>Explore clinics</Link>
    </section> : <>
      {(["upcoming", "past"] as const).map((period) => {
        const appointments = patientAppointments.filter((item) => item.period === period);
        return <section key={period} className={styles.section} aria-labelledby={`${period}-title`}>
          <h2 id={`${period}-title`}>{period === "upcoming" ? "Upcoming requests and appointments" : "Past appointments"}</h2>
          {appointments.length ? <ul className={styles.grid}>{appointments.map((appointment) => <li key={appointment.id}><PatientAppointmentCard appointment={appointment} /></li>)}</ul>
            : <p>No {period} appointments. <Link href="/search">Explore clinics</Link></p>}
        </section>;
      })}
    </>}
  </>;
}
