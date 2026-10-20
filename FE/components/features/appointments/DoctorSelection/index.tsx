"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FacilityDoctor } from "@/components/features/facilities/data/doctors";
import styles from "./DoctorSelection.module.css";

export default function DoctorSelection({ facilityId, doctors, initialDoctorOption = "" }: {
  initialDoctorOption?: string;
  facilityId: string;
  doctors: readonly FacilityDoctor[];
}) {
  const [selectedId, setSelectedId] = useState(initialDoctorOption);
  const router = useRouter();
  const affiliatedDoctors = doctors.filter((doctor) => doctor.facilityIds.includes(facilityId));
  const selectedDoctor = affiliatedDoctors.find((doctor) => doctor.id === selectedId);

  function selectDoctor(id: string) {
    setSelectedId(id);
    const query = new URLSearchParams(window.location.search);
    if (query.get("doctorOption") !== id) {
      ["slotId", "doctorId", "date", "time", "timeZone"].forEach((key) => query.delete(key));
    }
    query.set("doctorOption", id);
    window.history.replaceState(null, "", `/appointments/new?${query}`);
  }

  return (
    <section className={styles.section}>
      <fieldset className={styles.fieldset} aria-describedby="doctor-selection-note">
        <legend>Your doctor preference</legend>
        <p id="doctor-selection-note" className={styles.note}>Choose one option. This is a local preview; no appointment request is submitted.</p>
        <div className={styles.options}>
          <label className={styles.option}>
            <input type="radio" name="appointment-doctor" value="any" checked={selectedId === "any"} onChange={() => selectDoctor("any")} />
            <span><strong>Any available doctor</strong><span>No preference — the clinic or hospital can help match you with a doctor. Availability is not confirmed.</span></span>
          </label>
          {affiliatedDoctors.map((doctor) => (
            <label key={doctor.id} className={styles.option}>
              <input type="radio" name="appointment-doctor" value={doctor.id} checked={selectedId === doctor.id} onChange={() => selectDoctor(doctor.id)} />
              <span><strong>{doctor.name}</strong><span>{doctor.specialty}</span>{doctor.credentials && <span>{doctor.credentials}</span>}</span>
            </label>
          ))}
        </div>
        {!affiliatedDoctors.length && <p className={styles.note}>Individual doctor profiles are not listed for this facility yet. You can still choose no doctor preference.</p>}
      </fieldset>
      <p role="status" aria-atomic="true" className={styles.status}>
        {selectedId === "any" ? "Selected: Any available doctor" : selectedDoctor ? `Selected: ${selectedDoctor.name}` : "Select a doctor preference to get started."}
      </p>
      <button className={styles.continue} type="button" disabled={selectedId !== "any" && !selectedDoctor}
        onClick={() => { const query = new URLSearchParams(window.location.search); query.set("step", "time"); router.push(`/appointments/new?${query}`); }}>Continue to step 2: Date and time</button>
    </section>
  );
}

