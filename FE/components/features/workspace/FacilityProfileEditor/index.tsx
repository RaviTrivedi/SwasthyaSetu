"use client";

import { useRef, useState, type FormEvent } from "react";
import type { WorkspaceProfile } from "../data/profile";
import styles from "./FacilityProfileEditor.module.css";

type Field = Exclude<keyof WorkspaceProfile, "services">;
const fields: { key: Field; label: string; multiline?: boolean; optional?: boolean }[] = [
  { key: "name", label: "Facility name" }, { key: "type", label: "Facility type" },
  { key: "description", label: "Description", multiline: true },
  { key: "address", label: "Street address", multiline: true }, { key: "city", label: "City" },
  { key: "state", label: "State" }, { key: "postalCode", label: "Postal code" },
  { key: "phone", label: "Public phone number" }, { key: "email", label: "Public email", optional: true },
  { key: "hours", label: "Opening hours", multiline: true },
];

export default function FacilityProfileEditor({ profile, onSave, servicesOnly = false }: {
  profile: WorkspaceProfile; onSave: (profile: WorkspaceProfile) => void; servicesOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [service, setService] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("ready");
  const form = useRef<HTMLFormElement>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const value = editing ? draft : profile;
  function update(key: Field, text: string) {
    setDraft((previous) => ({ ...previous, [key]: text }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }
  function addService() {
    const normalized = service.trim().replace(/\s+/g, " ");
    if (!normalized || draft.services.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      setServiceError(!normalized ? "Enter a service name." : "This service is already listed.");
      addInput.current?.focus(); return;
    }
    setDraft({ ...draft, services: [...draft.services, normalized] });
    setService(""); setServiceError(""); addInput.current?.focus();
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (!servicesOnly) {
      fields.forEach(({ key, label, optional }) => { if (!optional && !draft[key].trim()) next[key] = `Enter ${label.toLowerCase()}.`; });
      if (!/^[1-9]\d{5}$/.test(draft.postalCode.trim())) next.postalCode = "Enter a valid 6-digit Indian postal code.";
      if (!/^(?:\+91)?[1-9]\d{9}$/.test(draft.phone.replace(/[\s()-]/g, ""))) next.phone = "Enter a 10-digit Indian phone number, with optional +91.";
      if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = "Enter a valid email address or leave blank.";
    }
    setErrors(next);
    const first = fields.find(({ key }) => next[key]);
    if (first) { (form.current?.elements.namedItem(first.key) as HTMLElement | null)?.focus(); return; }
    if (service.trim()) { setServiceError("Add this service or clear the field before saving."); addInput.current?.focus(); return; }
    // TODO: Save through backend after server-side organization/permission checks.
    // Do not publish or persist from this mock form or trust the preview role.
    onSave(servicesOnly ? { ...profile, services: [...draft.services] } : { ...draft });
    setEditing(false); setMessage("Preview only: changes updated locally. Nothing was published to the marketplace or saved permanently.");
    editButton.current?.focus();
  }
  return <section className={styles.panel}>
    <h2>{servicesOnly ? "Services and specialties" : "Facility profile"}</h2>
    <p>Review your public marketplace information. Changes here affect this workspace preview only.</p>
    {process.env.NODE_ENV === "development" && <label className={styles.preview}>Development state preview<select value={state} onChange={(event) => setState(event.target.value)}><option value="ready">Profile</option><option value="loading">Loading</option><option value="error">Error</option></select></label>}
    {state === "loading" ? <p role="status" aria-busy="true">Loading facility profile...</p> : state === "error" ? <div><p role="alert">We couldn’t load the facility profile.</p><button type="button" onClick={() => setState("ready")}>Try again</button></div> : <>
      <button ref={editButton} type="button" disabled={editing} onClick={() => { setDraft({ ...profile, services: [...profile.services] }); setEditing(true); setErrors({}); setMessage(""); setService(""); setServiceError(""); }}>Edit {servicesOnly ? "services" : "profile"}</button>
      <form ref={form} noValidate onSubmit={save}>
        {!servicesOnly && <>
          <div className={styles.placeholder}><strong>Facility image / logo placeholder</strong><p>Image upload is not available in this preview.</p></div>
          {/* TODO: Add validated image upload support backed by authorized storage endpoints. */}
          <div className={styles.grid}>{fields.map(({ key, label, multiline, optional }) => <div key={key}>
            <label htmlFor={`profile-${key}`}>{label}{optional ? " (optional)" : " (required)"}</label>
            {!editing ? <p className={styles.value}>{value[key] || "Not provided"}</p> : key === "type" ? <select id={`profile-${key}`} name={key} value={draft.type} onChange={(event) => update(key, event.target.value)}><option>Clinic</option><option>Hospital</option></select> : multiline ? <textarea id={`profile-${key}`} name={key} rows={3} maxLength={2000} required={!optional} value={draft[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `error-${key}` : undefined} /> : <input id={`profile-${key}`} name={key} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} inputMode={key === "postalCode" ? "numeric" : undefined} maxLength={key === "postalCode" ? 6 : 254} required={!optional} value={draft[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `error-${key}` : undefined} />}
            {errors[key] && <p id={`error-${key}`} className={styles.error}>{errors[key]}</p>}
          </div>)}</div>
        </>}
        <h3>Offered services and specialties</h3>
        {value.services.length ? <ul className={styles.services}>{value.services.map((item) => <li key={item}><span>{item}</span>{editing && <button type="button" aria-label={`Remove ${item}`} onClick={() => { setDraft({ ...draft, services: draft.services.filter((entry) => entry !== item) }); addInput.current?.focus(); }}>Remove</button>}</li>)}</ul> : <p role="status">No services listed. Use Edit and add the services offered by this facility.</p>}
        {editing && <>
          <label htmlFor="new-service">Add a service or specialty</label>
          <input ref={addInput} id="new-service" value={service} maxLength={100} onChange={(event) => { setService(event.target.value); setServiceError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addService(); } }} aria-invalid={Boolean(serviceError)} aria-describedby={serviceError ? "service-error" : undefined} />
          {serviceError && <p className={styles.error} id="service-error">{serviceError}</p>}
          <button type="button" onClick={addService}>Add service</button>
          <div className={styles.actions}><button type="submit">Save preview</button><button type="button" onClick={() => { setEditing(false); setDraft(profile); setErrors({}); setService(""); setServiceError(""); setMessage("Edits discarded."); editButton.current?.focus(); }}>Cancel</button></div>
        </>}
      </form>
    </>}
    <p role="status">{message}</p>
  </section>;
}
