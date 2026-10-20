"use client";

import Link from "next/link";
import { useState } from "react";
import type { PatientAppointment, AppointmentStatus } from "../data/appointments";
import styles from "./PatientAppointmentCard.module.css";

const descriptions: Record<AppointmentStatus, string> = {
  Pending: "The clinic has not approved this request yet.",
  Confirmed: "The clinic has approved this appointment.",
  Rejected: "The clinic could not accept this request. Explore another care option.",
  Cancelled: "This sample appointment was cancelled.",
  Completed: "This sample visit is complete.",
};

export default function PatientAppointmentCard({ appointment }: { appointment: PatientAppointment }) {
  const [message, setMessage] = useState("");
  const canCancel = appointment.period === "upcoming" && (appointment.status === "Pending" || appointment.status === "Confirmed");
  const date = new Date(appointment.startsAt);
  return <article className={styles.card} aria-labelledby={`${appointment.id}-title`}>
    <span className={styles.status} data-status={appointment.status}>{appointment.status === "Pending" ? "Pending clinic approval" : appointment.status}</span>
    <h3 id={`${appointment.id}-title`}>{appointment.facilityName}</h3>
    <p>{appointment.doctorName ?? "Any available doctor"}</p>
    <p className={styles.service}>{appointment.service}</p>
    <time dateTime={appointment.startsAt}>
      {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date)} IST
    </time>
    <p className={styles.note}>{descriptions[appointment.status]}</p>
    <Link className={styles.details} href={`/appointments/${appointment.id}`}>View details<span className="visually-hidden"> for {appointment.facilityName}</span></Link>
    {canCancel && <button type="button" onClick={() => {
      // TODO: Add cancellation confirmation, then call the backend mutation.
      // Update status only after the backend confirms cancellation succeeded.
      setMessage("Cancellation is not available in this preview. Nothing has been cancelled; your request status is unchanged.");
    }}>{appointment.status === "Pending" ? "Cancel request" : "Cancel appointment"}</button>}
    <p role="status" className={styles.note}>{message}</p>
  </article>;
}

