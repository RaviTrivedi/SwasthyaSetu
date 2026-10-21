import Link from 'next/link';
import { getFacility } from '@/components/features/facilities/data/facilities';
import {
  getAppointmentSlots,
  formatSlotDate,
  formatSlotTime,
} from '../data/slots';
import styles from './AppointmentRequested.module.css';

export default async function AppointmentRequested({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const facility =
    typeof params.facilityId === 'string'
      ? getFacility(params.facilityId)
      : undefined;
  const slot =
    facility && typeof params.doctorOption === 'string'
      ? getAppointmentSlots(facility.id, params.doctorOption).find(
          (item) => item.id === params.slotId,
        )
      : undefined;

  // TODO: Replace this explicitly marked mock URL context with the backend response
  // and persisted appointment request ID. Read the Pending status from that response.
  // URL parameters are not proof that a real request was submitted.
  if (params.preview !== 'request-sent' || !facility || !slot) {
    return (
      <section className={styles.panel}>
        <h1>No appointment request to show yet</h1>
        <p>
          Choose a clinic, doctor and time, then complete your patient details
          to preview a request.
        </p>
        <div className={styles.actions}>
          <Link href="/search">Find care</Link>
          <Link href="/">Back to home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="request-title">
      <p className={styles.preview}>
        Demo preview — no real request has been sent
      </p>
      <span className={styles.check} aria-hidden="true">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      </span>
      <h1 id="request-title">
        Appointment request sent <span>(preview)</span>
      </h1>
      <p className={styles.status}>Waiting for clinic approval</p>
      <p>
        When request submission is available, the clinic will contact you after
        reviewing your request. An appointment is only confirmed after clinic
        approval.
      </p>
      <h2>Request summary</h2>
      <dl className={styles.summary}>
        <div>
          <dt>Clinic or hospital</dt>
          <dd>{facility.name}</dd>
        </div>
        <div>
          <dt>
            Doctor
            {params.doctorOption === 'any' ? ' (any available doctor)' : ''}
          </dt>
          <dd>{slot.doctorName}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatSlotDate(slot.date)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatSlotTime(slot)} IST (Asia/Kolkata)</dd>
        </div>
        <div>
          <dt>Request status</dt>
          <dd>Pending (preview)</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <Link href="/appointments">View my appointments</Link>
        <Link href="/">Back to home</Link>
      </div>
      <p className={styles.note}>
        My appointments shows sample history. This preview does not save a
        request or send notifications.
      </p>
    </section>
  );
}
