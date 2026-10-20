"use client";
import { useRef, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import { affiliationDirectory } from "../data/affiliations";
import type { WorkspaceRequest } from "../data/workspace";
import { overlaps, minutes, slotBookings, type ManagedSlot } from "../data/slots";
import styles from "./SlotManagement.module.css";

const blank: ManagedSlot = { id: "", date: "", start: "", end: "", doctorId: "" };
export default function SlotManagement({ slots, onChange, requests, affiliatedIds }: {
  slots: ManagedSlot[]; onChange: (slots: ManagedSlot[]) => void; requests: WorkspaceRequest[]; affiliatedIds: string[];
}) {
  const [draft, setDraft] = useState<ManagedSlot | null>(null);
  const [date, setDate] = useState("");
  const [doctor, setDoctor] = useState("all");
  const [status, setStatus] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("ready");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const doctors = affiliationDirectory.filter((item) => affiliatedIds.includes(item.id));
  // TODO: Load facility-scoped slots from backend after staff permission checks.
  function statusOf(slot: ManagedSlot) {
    const bookings = slotBookings(slot, requests);
    return bookings.some((item) => item.status === "Confirmed") ? "Booked" : bookings.length ? "Requested" : "Available";
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return;
    const original = slots.find((slot) => slot.id === draft.id);
    let problem = "";
    if (!draft.date || !draft.start || !draft.end) problem = "Enter the date, start time and end time.";
    else if (minutes(draft.end) <= minutes(draft.start)) problem = "End time must be after start time on the same day.";
    else if (draft.doctorId && !affiliatedIds.includes(draft.doctorId)) problem = "Choose a currently affiliated doctor.";
    else if (original && slotBookings(original, requests).length) problem = "Resolve pending or confirmed appointments before editing this slot.";
    else if (slots.some((slot) => slot.id !== draft.id && overlaps(draft, slot)) || slotBookings(draft, requests).length) problem = "This time overlaps another slot or active appointment. Any available doctor slots must not overlap any doctor’s slots.";
    if (problem) { setError(problem); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    // TODO: Backend must recheck staff permissions, affiliations, booking locks and
    // overlapping slots atomically before saving. This is local preview state only.
    const saved = { ...draft, id: draft.id || crypto.randomUUID() };
    onChange(original ? slots.map((slot) => slot.id === saved.id ? saved : slot) : [...slots, saved]);
    setDraft(null); setError(""); setMessage("Preview only: slot saved locally. Nothing was published or persisted."); createRef.current?.focus();
  }
  const visible = slots.filter((slot) => (!date || slot.date === date) && (doctor === "all" || slot.doctorId === doctor) && (status === "all" || statusOf(slot) === status)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  return <section className={styles.section}>
    <h2>Availability and appointment slots</h2>
    <p>Managed by the facility. All dates and times use Asia/Kolkata (IST). The backend must recheck permissions, availability and booking conflicts when saving or approving.</p>
    {process.env.NODE_ENV === "development" && <label>Development state preview<select value={state} onChange={(event) => setState(event.target.value)}><option value="ready">Slots</option><option value="loading">Loading</option><option value="error">Error</option></select></label>}
    <p role="status">{message}</p>
    {state === "loading" ? <p role="status" aria-busy="true">Loading facility slots...</p> : state === "error" ? <div><p role="alert">Could not load slots.</p><button type="button" onClick={() => setState("ready")}>Try again</button></div> : <>
      <button ref={createRef} type="button" onClick={() => { setDraft({ ...blank, date }); setError(""); setMessage(""); }}>Create slot</button>
      {draft && <Modal title={draft.id ? "Edit slot" : "Create slot"} onClose={() => setDraft(null)}><form onSubmit={save} aria-describedby={error ? "slot-error" : undefined}>
        <div className={styles.grid}>{(["date", "start", "end"] as const).map((key) => <label key={key}>{key === "date" ? "Date" : key === "start" ? "Start time" : "End time"} (required)<input type={key === "date" ? "date" : "time"} required value={draft[key]} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setError(""); }} /></label>)}
          <label>Assigned doctor<select value={draft.doctorId} onChange={(event) => setDraft({ ...draft, doctorId: event.target.value })}><option value="">Any available doctor</option>{doctors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <p id="slot-error" ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p>
        <button type="submit">Save slot (preview)</button><button type="button" onClick={() => { setDraft(null); createRef.current?.focus(); }}>Cancel</button>
      </form></Modal>}
      <div className={styles.grid}>
        <label>Filter by date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Doctor<select value={doctor} onChange={(event) => setDoctor(event.target.value)}><option value="all">All doctors</option><option value="">Any available doctor</option>{affiliationDirectory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{["Available", "Requested", "Booked"].map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      {!visible.length ? <div><p role="status">No slots match this view. Create a slot or clear the filters.</p><button type="button" onClick={() => { setDate(""); setDoctor("all"); setStatus("all"); }}>Clear filters</button></div> : <ul className={styles.list}>{visible.map((slot) => {
        const locked = slotBookings(slot, requests).length > 0;
        return <li key={slot.id}>
          <h3>{slot.date} · {slot.start}–{slot.end} IST</h3>
          <p>{affiliationDirectory.find((item) => item.id === slot.doctorId)?.name ?? "Any available doctor"} · {minutes(slot.end) - minutes(slot.start)} minutes</p>
          <p><strong>{statusOf(slot)}</strong>{slot.doctorId && !affiliatedIds.includes(slot.doctorId) ? " · Doctor no longer affiliated; reassign an unlocked slot." : ""}</p>
          {locked && <p id={`locked-${slot.id}`}>An appointment is pending or confirmed. Resolve it first; this slot cannot be edited or deleted.</p>}
          <button type="button" disabled={locked} aria-describedby={locked ? `locked-${slot.id}` : undefined} onClick={() => { setDraft({ ...slot }); setError(""); }}>Edit</button>
          <button type="button" disabled={locked} aria-describedby={locked ? `locked-${slot.id}` : undefined} onClick={() => setDeleting(slot.id)}>Delete</button>
          {deleting === slot.id && <Modal title="Delete slot" onClose={() => setDeleting(null)}><p>Delete the {slot.date}, {slot.start}–{slot.end} IST slot from the local preview?</p><button type="button" onClick={() => setDeleting(null)}>Keep slot</button><button type="button" disabled={locked} onClick={() => {
            // TODO: Backend must recheck permissions and appointment locks before deletion.
            if (slotBookings(slot, requests).length) return;
            onChange(slots.filter((item) => item.id !== slot.id)); setDeleting(null); if (draft?.id === slot.id) setDraft(null); setMessage("Preview only: slot deleted locally. No appointments were cancelled or moved."); createRef.current?.focus();
          }}>Confirm deletion</button></Modal>}
        </li>;
      })}</ul>}
    </>}
  </section>;
}
