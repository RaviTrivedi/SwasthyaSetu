import type { ConsultationDetails } from "../data/consultations";
import styles from "./DoctorConsultation.module.css";

export default function DoctorConsultation({ consultation }: { consultation: ConsultationDetails }) {
  return (
    <section className={styles.section} aria-labelledby="doctor-consultation-title">
      <h2 id="doctor-consultation-title">Services and consultation</h2>
      <h3>Services and care types</h3>
      <ul className={styles.chips}>{consultation.services.map((service) => <li key={service}>{service}</li>)}</ul>
      <dl className={styles.facts}>
        <div><dt>Spoken languages</dt><dd>{consultation.languages.join(", ")}</dd></div>
        <div><dt>Consultation fee</dt><dd>{consultation.feeINR === null ? "Contact clinic" : `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(consultation.feeINR)} per consultation (INR)`}</dd></div>
      </dl>
      <p className={styles.note}>Sample consultation information for this fictional profile.</p>
    </section>
  );
}
