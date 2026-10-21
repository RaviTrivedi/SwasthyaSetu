'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FacilityDetails } from '@/components/features/facilities/data/facilities';
import { formatSlotDate, formatSlotTime, type FlowSlot } from '../data/slots';
import styles from './AppointmentTimeSelection.module.css';

export default function AppointmentTimeSelection({
  facility,
  doctorOption,
  slots,
  initialSlotId,
}: {
  facility: FacilityDetails;
  doctorOption: string;
  slots: FlowSlot[];
  initialSlotId?: string;
}) {
  const initialSlot = slots.find((slot) => slot.id === initialSlotId);
  const [date, setDate] = useState(initialSlot?.date ?? '');
  const [slotId, setSlotId] = useState(initialSlot?.id ?? '');
  const router = useRouter();
  const selected = slots.find(
    (slot) => slot.id === slotId && slot.date === date,
  );
  const dates = [...new Set(slots.map((slot) => slot.date))];
  function selectTime(day: string, slot?: FlowSlot) {
    setDate(day);
    setSlotId(slot?.id ?? '');
    const query = new URLSearchParams(window.location.search);
    ['slotId', 'doctorId', 'date', 'time', 'timeZone'].forEach((key) =>
      query.delete(key),
    );
    if (slot) {
      Object.entries({
        slotId: slot.id,
        doctorId: slot.doctorId,
        date: slot.date,
        time: slot.time,
        timeZone: 'Asia/Kolkata',
      }).forEach(([key, value]) => query.set(key, value));
    }
    window.history.replaceState(null, '', `/appointments/new?${query}`);
  }
  return (
    <section className={styles.section}>
      <h2>Choose a date and time</h2>
      <p>
        All times are in Indian Standard Time (Asia/Kolkata). Sample
        availability only.
      </p>
      <Link
        href={`/appointments/new?${new URLSearchParams({ facilityId: facility.id, doctorOption, ...(selected ? { slotId: selected.id, doctorId: selected.doctorId, date: selected.date, time: selected.time, timeZone: 'Asia/Kolkata' } : {}) })}`}
      >
        Change doctor preference
      </Link>
      {slots.length ? (
        <>
          <fieldset>
            <legend>Available dates</legend>
            <div className={styles.options}>
              {dates.map((day) => (
                <label key={day}>
                  <input
                    type="radio"
                    name="appointment-date"
                    checked={date === day}
                    onChange={() => selectTime(day)}
                  />
                  {formatSlotDate(day)}
                </label>
              ))}
            </div>
          </fieldset>
          {date ? (
            <fieldset>
              <legend>Available times for {formatSlotDate(date)}</legend>
              <div className={styles.options}>
                {slots
                  .filter((slot) => slot.date === date)
                  .map((slot) => (
                    <label key={slot.id}>
                      <input
                        type="radio"
                        name="appointment-time"
                        checked={slotId === slot.id}
                        onChange={() => selectTime(slot.date, slot)}
                      />
                      <span>
                        {formatSlotTime(slot)} IST
                        {doctorOption === 'any' && (
                          <strong>{slot.doctorName}</strong>
                        )}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>
          ) : (
            <p role="status">Choose a date to see its available times.</p>
          )}
        </>
      ) : (
        <p role="status" className={styles.empty}>
          No available slots for this doctor preference. Choose another doctor
          or check again later.
        </p>
      )}
      <p>
        Next: enter patient details in step 3. Choosing a time does not submit
        an appointment request.
      </p>
      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          const query = new URLSearchParams({
            facilityId: facility.id,
            doctorOption,
            doctorId: selected.doctorId,
            slotId: selected.id,
            date: selected.date,
            time: selected.time,
            timeZone: 'Asia/Kolkata',
            step: 'details',
          });
          router.push(`/appointments/new?${query}`);
        }}
      >
        Continue to step 3: Patient details
      </button>
    </section>
  );
}
