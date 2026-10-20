"use client";

import Link from "next/link";
import { useState } from "react";
import SlotManagement from "../SlotManagement";
import { initialManagedSlots } from "../data/slots";
import DoctorManagement from "../DoctorManagement";
import { initialAffiliatedDoctorIds } from "../data/affiliations";
import FacilityProfileEditor from "../FacilityProfileEditor";
import { initialWorkspaceProfile } from "../data/profile";
import WorkspaceRequests from "../WorkspaceRequests";
import { workspaceRequests } from "../data/workspace";
import WorkspaceDashboard from "../WorkspaceDashboard";
import { previewRoles, workspaceFacility, type PreviewRole } from "../data/workspace";
import styles from "./WorkspaceShell.module.css";

const sections = ["Dashboard", "Appointment Requests", "Doctors", "Availability", "Services", "Facility Profile"] as const;
export type WorkspaceSection = typeof sections[number];

export default function WorkspaceShell() {
  // TODO: Load the editable facility profile from the authorized backend.
  const [slots, setSlots] = useState(initialManagedSlots);
  const [affiliatedIds, setAffiliatedIds] = useState(initialAffiliatedDoctorIds);
  const [profile, setProfile] = useState(initialWorkspaceProfile);
  const [requests, setRequests] = useState(workspaceRequests);
  const [section, setSection] = useState<WorkspaceSection>("Dashboard");
  const [role, setRole] = useState<PreviewRole>("administrator");
  // TODO: Resolve the signed-in user's organization and permissions on the server.
  // Enforce access in the backend before loading real data. This local role is
  // only a visual preview; neither it nor a phone number authorizes any access.
  return <>
    <header className={styles.header}>
      <p>Clinic and hospital workspace · Mock preview</p>
      <h1>{profile.name}</h1>
      <p>{profile.type} · {profile.address}, {profile.city}</p>
      <p>No authentication or live patient data is connected.</p>
    </header>
    {process.env.NODE_ENV === "development" && <section className={styles.preview} aria-labelledby="role-preview-title">
      <h2 id="role-preview-title">Development-only role preview</h2>
      <p>Not a login. Dummy phone labels do not verify identity or grant permissions. No OTP is sent.</p>
      <label htmlFor="mock-role">Preview role and reserved dummy phone</label>
      <select id="mock-role" value={role} onChange={(event) => { setRole(event.target.value as PreviewRole); setSection("Dashboard"); }}>
        {previewRoles.map((item) => <option key={item.role} value={item.role}>{item.label} — {item.phone}</option>)}
      </select>
      <p role="status">Previewing: {previewRoles.find((item) => item.role === role)?.label}</p>
    </section>}
    {role === "patient" ? <section className={styles.placeholder}><h2>Patient preview</h2><p>Use the existing patient pages to explore care and sample appointment history.</p><Link href="/appointments">My appointments</Link><Link href="/search">Find care</Link></section>
      : role === "doctor" ? <section className={styles.placeholder}><h2>Doctor workspace — coming soon</h2><p>Doctor tools are not implemented yet. This preview remains affiliated with {workspaceFacility.name}.</p><Link href="/doctors/meera-vyas">View sample doctor profile</Link></section>
      : <div className={styles.layout}>
        <nav className={styles.navigation} aria-label="Facility workspace">
          {sections.map((item) => <button key={item} type="button" aria-current={section === item ? "page" : undefined} onClick={() => setSection(item)}>{item}</button>)}
        </nav>
        <div className={styles.content}>
          {section === "Dashboard" ? <WorkspaceDashboard onNavigate={setSection} requests={requests} activeDoctorCount={affiliatedIds.length} /> : section === "Appointment Requests" ? <WorkspaceRequests requests={requests} setRequests={setRequests} /> : section === "Availability" ? <SlotManagement slots={slots} onChange={setSlots} requests={requests} affiliatedIds={affiliatedIds} /> : section === "Doctors" ? <DoctorManagement affiliatedIds={affiliatedIds} onChange={setAffiliatedIds} facilityName={profile.name} /> : section === "Services" || section === "Facility Profile" ? <FacilityProfileEditor key={section} profile={profile} onSave={setProfile} servicesOnly={section === "Services"} /> : <section className={styles.placeholder} aria-live="polite">
            <h2>{section}</h2><p>Coming soon. {section} tools for this facility are not available yet.</p>
            <button type="button" onClick={() => setSection("Dashboard")}>Back to dashboard</button>
          </section>}
        </div>
      </div>}
  </>;
}




