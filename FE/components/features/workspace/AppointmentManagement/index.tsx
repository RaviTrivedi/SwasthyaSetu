'use client';
import { useCallback, useState } from 'react';
import { workspaceApi } from '../api';
import { useResource } from '../use-resource';
import styles from '../WorkspaceForms.module.css';

function Appointments({
  date,
  page,
  setPage,
}: {
  date: string;
  page: number;
  setPage: (page: number) => void;
}) {
  const load = useCallback(
    () =>
      workspaceApi.appointments(
        new URLSearchParams({
          page: String(page),
          pageSize: '20',
          ...(date ? { date } : {}),
        }).toString(),
      ),
    [date, page],
  );
  const resource = useResource(load);
  if (resource.loading) return <p role="status">Loading appointments...</p>;
  if (resource.error)
    return (
      <section role="alert">
        <p>{resource.error.message}</p>
        <button onClick={resource.retry}>Retry</button>
      </section>
    );
  const data = resource.data!;
  const format = (value: string) =>
    new Date(value).toLocaleString('en-IN', {
      timeZone: data.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  return (
    <>
      <div className={styles.actions}>
        <p>
          {data.total} appointments · Timezone: {data.timezone}
        </p>
        <button onClick={resource.retry}>Refresh appointments</button>
      </div>
      {!data.items.length && (
        <p>No appointments found{date ? ' for this date' : ''}.</p>
      )}
      {data.items.map((item) => (
        <article className={styles.panel} key={item.id}>
          <h3>{item.patient.firstName}</h3>
          <p>
            <strong>{item.status}</strong>
            {item.status === 'BOOKED'
              ? ' — Confirmed; no approval needed'
              : ' — Historical pending appointment'}
          </p>
          <p>
            {format(item.slot.startsAt)} – {format(item.slot.endsAt)}
          </p>
          <p>Booking ID: {item.id}</p>
          <p>Booked on: {format(item.createdAt)}</p>
          {item.appointmentNote && (
            <p>Appointment note: {item.appointmentNote}</p>
          )}
        </article>
      ))}
      <nav className={styles.paginationBtns} aria-label="Appointment pages">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
        </span>
        <button
          disabled={page >= 100000 || page * data.pageSize >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </nav>
    </>
  );
}
export default function AppointmentManagement() {
  const [date, setDate] = useState(''),
    [page, setPage] = useState(1);
  return (
    <section className={styles.panel}>
      <h2>Appointments</h2>
      <p>
        Patient bookings are confirmed immediately. Filter dates use your
        facility timezone.
      </p>
      <div className={styles.actions}>
        <label>
          Appointment date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          onClick={() => {
            setDate('');
            setPage(1);
          }}
        >
          All dates
        </button>
      </div>
      <Appointments
        key={`${date}:${page}`}
        date={date}
        page={page}
        setPage={setPage}
      />
    </section>
  );
}
