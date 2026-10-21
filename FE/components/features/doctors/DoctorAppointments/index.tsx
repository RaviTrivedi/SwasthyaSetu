'use client';

import { useState } from 'react';
import type { FacilityDetails } from '@/components/features/facilities/data/facilities';
import type { AppointmentSlot } from '../data/consultations';
import styles from './DoctorAppointments.module.css';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export default function DoctorAppointments({
  slots,
  affiliations,
}: {
  slots: readonly AppointmentSlot[];
  affiliations: readonly FacilityDetails[];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const validSlots = slots.filter((slot) =>
    affiliations.some((facility) => facility.id === slot.facilityId),
  );
  const selected = validSlots.find((slot) => slot.id === selectedId);

  return (
    <section
      className={styles.section}
      aria-labelledby="doctor-appointments-title"
    >
      <h2 id="doctor-appointments-title">Available appointment times</h2>
      <p className={styles.note} id="slot-preview-note">
        Sample times in Indian Standard Time (IST). Requests require clinic
        approval before confirmation.
      </p>
      {validSlots.length ? (
        <fieldset className={styles.slots} aria-describedby="slot-preview-note">
          <legend>Select one appointment time</legend>
          {affiliations.map((facility) => {
            const facilitySlots = validSlots.filter(
              (slot) => slot.facilityId === facility.id,
            );
            if (!facilitySlots.length) return null;
            return (
              <div key={facility.id} className={styles.group}>
                <h3>{facility.name}</h3>
                <p className={styles.note}>{facility.address}</p>
                <div className={styles.grid}>
                  {facilitySlots.map((slot) => (
                    <label key={slot.id} className={styles.slot}>
                      <input
                        type="radio"
                        name="doctor-appointment-slot"
                        value={slot.id}
                        checked={selectedId === slot.id}
                        onChange={() => {
                          setSelectedId(slot.id);
                          setMessage('');
                        }}
                      />
                      <span>
                        <span className="visually-hidden">
                          {facility.name},{' '}
                        </span>
                        {dateFormat.format(new Date(slot.startsAt))}
                        <strong>
                          {timeFormat.format(new Date(slot.startsAt))} IST
                        </strong>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </fieldset>
      ) : (
        <p className={styles.empty}>
          No appointment times are available. Contact the affiliated clinic for
          availability.
        </p>
      )}
      <button
        type="button"
        className={styles.request}
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          const facility = affiliations.find(
            (entry) => entry.id === selected.facilityId,
          )!;
          setMessage(
            `You selected ${dateFormat.format(new Date(selected.startsAt))} at ${timeFormat.format(new Date(selected.startsAt))} IST at ${facility.name}. The booking request flow will follow. No request has been submitted or confirmed.`,
          );
        }}
      >
        Request appointment
      </button>
      <p className={styles.status} role="status" aria-atomic="true">
        {message}
      </p>
    </section>
  );
}
