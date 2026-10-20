import type { FacilityDetails } from "@/components/features/facilities/data/facilities";
import { formatSlotDate, formatSlotTime, type FlowSlot } from "../data/slots";
import styles from "./AppointmentReview.module.css";

export default function AppointmentReview({ facility, doctorOption, slot }: { facility: FacilityDetails; doctorOption: string; slot: FlowSlot }) {
  return (
    <section className={styles.review} aria-labelledby="appointment-review-title">
      <h2 id="appointment-review-title">Review your selection</h2>
      <dl>
        <div><dt>Clinic or hospital</dt><dd>{facility.name}</dd></div>
        <div><dt>{doctorOption === "any" ? "Doctor for this slot (no preference)" : "Doctor"}</dt><dd>{slot.doctorName}</dd></div>
        <div><dt>Date</dt><dd>{formatSlotDate(slot.date)}</dd></div>
        <div><dt>Time</dt><dd>{formatSlotTime(slot)} IST (Asia/Kolkata)</dd></div>
        <div><dt>Consultation fee</dt><dd>{slot.feeINR === null ? "Contact clinic" : `₹${slot.feeINR} per consultation (INR)`}</dd></div>
      </dl>
      <p>Availability is provisional. This selection does not reserve a slot. Requests remain pending until approved by the clinic.</p>
    </section>
  );
}
