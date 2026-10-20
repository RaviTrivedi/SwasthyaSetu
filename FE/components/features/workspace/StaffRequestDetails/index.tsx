import type { ReactNode } from "react";
import { workspaceFacility, workspaceDoctors, type WorkspaceRequest } from "../data/workspace";
import styles from "./StaffRequestDetails.module.css";

export default function StaffRequestDetails({ request, onBack, children }: { request?: WorkspaceRequest; onBack: () => void; children?: ReactNode }) {
  // TODO: Load organization-scoped request details from the backend with access checks.
  return <section className={styles.details}>
    <button type="button" onClick={onBack}>Back to appointment requests</button>
    {!request ? <><h2>Request not found</h2><p>This request is unavailable or its ID is incorrect.</p></> : <>
      <h2>Appointment request details</h2>
      <p><strong>{request.status === "Pending" ? "Pending clinic approval" : request.status}</strong> · Local preview</p>
      <p>{request.status === "Pending" ? "Awaiting clinic review; this appointment is not confirmed." : request.status === "Confirmed" ? "Approved in this sample. No notification has been sent." : "Rejected in this sample. No notification has been sent."}</p>
      <dl>
        <div><dt>Patient</dt><dd>{request.patient}</dd></div>
        <div><dt>Booking phone (dummy)</dt><dd>{request.phone}</dd></div>
        {request.email && <div><dt>Email</dt><dd>{request.email}</dd></div>}
        <div><dt>Clinic or hospital</dt><dd>{workspaceFacility.name}</dd></div>
        <div><dt>Doctor</dt><dd>{request.doctor ?? "Any available doctor"}</dd></div>
        {request.doctor && <div><dt>Doctor specialty</dt><dd>{workspaceDoctors.find((doctor) => doctor.name === request.doctor)?.specialty ?? request.service}</dd></div>}
        <div><dt>Service</dt><dd>{request.service}</dd></div>
        <div><dt>Requested time</dt><dd>{formatDate(request.startsAt)} IST</dd></div>
        <div><dt>Created</dt><dd>{formatDate(request.createdAt)} IST</dd></div>
        <div><dt>Reason for visit</dt><dd>{request.reason}</dd></div>
      </dl>
      {children}
    </>}
  </section>;
}
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
