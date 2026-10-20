"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { PatientAppointment } from "../data/appointments";
import { getFacility } from "@/components/features/facilities/data/facilities";
import { getFacilityDoctors } from "@/components/features/facilities/data/doctors";
import styles from "./AppointmentDetails.module.css";

const explanations = {
  Pending: "Your request is awaiting clinic review. It is not yet confirmed.",
  Confirmed: "The clinic has approved this appointment.",
  Rejected: "The clinic could not accept this request. You can explore another clinic or time.",
  Cancelled: "This sample appointment was cancelled. No visit is scheduled for this request.",
  Completed: "This sample visit has been completed.",
};

export default function AppointmentDetails({ appointment }: { appointment: PatientAppointment }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const facility = getFacility(appointment.facilityId);
  const doctor = getFacilityDoctors(appointment.facilityId).find((item) => item.name === appointment.doctorName);
  const canCancel = appointment.period === "upcoming" && ["Pending", "Confirmed"].includes(appointment.status);
  function closeConfirmation() { setConfirming(false); trigger.current?.focus(); }

  return <>
    <Link className={styles.link} href="/appointments">Back to My appointments</Link>
    <article className={styles.panel}>
      <header>
        <h1>Appointment details</h1>
        <p className={styles.note}>Fictional appointment preview · {appointment.id}</p>
        <p className={styles.status} data-status={appointment.status}>{appointment.status === "Pending" ? "Pending clinic approval" : appointment.status}</p>
        <p>{explanations[appointment.status]}</p>
      </header>
      <section className={styles.section} aria-labelledby="facility-heading">
        <h2 id="facility-heading">Clinic or hospital</h2>
        <h3>{appointment.facilityName}</h3>
        <p>{facility?.address ?? "Address unavailable"}</p>
        <p className={styles.note}>Clinic contact information is not available in this sample.</p>
        <Link className={styles.link} href={`/facilities/${appointment.facilityId}`}>View facility</Link>
      </section>
      <section className={styles.section} aria-labelledby="visit-heading">
        <h2 id="visit-heading">Visit details</h2>
        <dl className={styles.grid}>
          <div><dt>Doctor</dt><dd>{appointment.doctorName ?? "Any available doctor"}</dd></div>
          {appointment.doctorName && <div><dt>Doctor specialty</dt><dd>{doctor?.specialty ?? appointment.service}</dd></div>}
          <div><dt>Date and time</dt><dd><time dateTime={appointment.startsAt}>{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" }).format(new Date(appointment.startsAt))} IST</time></dd></div>
          <div><dt>Consultation type</dt><dd>{appointment.consultationType}</dd></div>
          <div><dt>Service</dt><dd>{appointment.service}</dd></div>
        </dl>
      </section>
      <section className={styles.section} aria-labelledby="patient-heading">
        <h2 id="patient-heading">Patient and booking contact</h2>
        <dl className={styles.grid}>
          <div><dt>Patient name</dt><dd>{appointment.patientName}</dd></div>
          <div><dt>Booking phone</dt><dd>{appointment.bookingPhone}</dd></div>
          {appointment.email && <div><dt>Email</dt><dd>{appointment.email}</dd></div>}
        </dl>
      </section>
      {canCancel && <section className={styles.section} aria-label="Cancellation">
        <button ref={trigger} type="button" aria-expanded={confirming} aria-controls="cancel-confirmation" onClick={() => { setConfirming(true); setMessage(""); }}>
          {appointment.status === "Pending" ? "Cancel request" : "Cancel appointment"}
        </button>
        {confirming && <div id="cancel-confirmation" className={styles.confirmation}>
          <h2>Continue with cancellation?</h2>
          <p>This is a preview only. Your appointment status will not change.</p>
          <div className={styles.actions}>
            <button type="button" onClick={closeConfirmation}>Keep appointment request</button>
            <button type="button" onClick={() => {
              // TODO: Call the cancellation backend after explicit confirmation.
              // Only update the status after a successful backend response.
              setMessage("Cancellation is not connected yet. Nothing has been cancelled; the status is unchanged.");
              closeConfirmation();
            }}>Continue cancellation (preview)</button>
          </div>
        </div>}
        <p role="status">{message}</p>
      </section>}
    </article>
  </>;
}
