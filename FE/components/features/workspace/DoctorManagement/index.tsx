'use client';

import { useRef, useState } from 'react';
import { affiliationDirectory } from '../data/affiliations';
import { workspaceFacility } from '../data/workspace';
import {
  getAppointmentSlots,
  formatSlotDate,
} from '@/components/features/appointments/data/slots';
import styles from './DoctorManagement.module.css';

export default function DoctorManagement({
  affiliatedIds,
  onChange,
  facilityName,
}: {
  affiliatedIds: string[];
  onChange: (ids: string[]) => void;
  facilityName: string;
}) {
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [state, setState] = useState('ready');
  const addButton = useRef<HTMLButtonElement>(null);
  // TODO: Fetch existing doctors and facility affiliations from the backend only
  // after server-side staff and organization permission checks.
  const affiliated = affiliationDirectory.filter((doctor) =>
    affiliatedIds.includes(doctor.id),
  );
  const available = affiliationDirectory.filter(
    (doctor) => !affiliatedIds.includes(doctor.id),
  );
  const visible = affiliated.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (!specialty || doctor.specialty === specialty),
  );
  function save(ids: string[], note: string) {
    // TODO: Call the affiliation endpoint; the backend must verify staff permissions,
    // facility scope and doctor identity. Never authorize using the preview role.
    onChange(ids);
    setMessage(
      `Preview only: ${note} Nothing was saved permanently or published to the marketplace.`,
    );
  }
  return (
    <section className={styles.section}>
      <h2>Doctors and affiliations</h2>
      <p>
        Manage doctors linked to {facilityName}. Doctors must have a clinic or
        hospital affiliation to appear as marketplace providers.
      </p>
      <p className={styles.note}>
        Only facility associations can be changed here. The current model has no
        editable facility-specific doctor fields; global profiles and
        availability remain unchanged.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <label className={styles.preview}>
          Development state preview
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="ready">Doctors</option>
            <option value="loading">Loading</option>
            <option value="error">Error</option>
          </select>
        </label>
      )}
      <p role="status" className={styles.message}>
        {message}
      </p>
      {state === 'loading' ? (
        <p role="status" aria-busy="true">
          Loading affiliated doctors...
        </p>
      ) : state === 'error' ? (
        <div>
          <p role="alert">We couldn’t load the facility’s doctors.</p>
          <button type="button" onClick={() => setState('ready')}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <button
            ref={addButton}
            type="button"
            aria-expanded={adding}
            aria-controls="add-doctor-panel"
            onClick={() => {
              setAdding(true);
              setSelected('');
              setMessage('');
            }}
          >
            Add doctor
          </button>
          {adding && (
            <div id="add-doctor-panel" className={styles.panel}>
              <h3>Link an existing doctor</h3>
              <p>
                This links a profile to this facility. It does not create a
                standalone doctor or delete other affiliations.
              </p>
              {available.length ? (
                <>
                  <label htmlFor="existing-doctor">Existing doctor</label>
                  <select
                    id="existing-doctor"
                    value={selected}
                    onChange={(event) => setSelected(event.target.value)}
                  >
                    <option value="">Choose a doctor</option>
                    {available.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} — {doctor.specialty}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      !available.some((doctor) => doctor.id === selected)
                    }
                    onClick={() => {
                      const doctor = available.find(
                        (entry) => entry.id === selected,
                      );
                      if (!doctor) return;
                      save(
                        [...affiliatedIds, doctor.id],
                        `${doctor.name} linked to this facility locally.`,
                      );
                      setAdding(false);
                      setSelected('');
                      addButton.current?.focus();
                    }}
                  >
                    Link doctor (preview)
                  </button>
                </>
              ) : (
                <p>
                  All existing mock doctors are already linked to this facility.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  addButton.current?.focus();
                }}
              >
                Cancel
              </button>
            </div>
          )}
          <div className={styles.filters}>
            <label>
              Search doctor name
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Specialty
              <select
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
              >
                <option value="">All specialties</option>
                {[
                  ...new Set(
                    affiliationDirectory.map((doctor) => doctor.specialty),
                  ),
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          {!affiliated.length ? (
            <p role="status">
              No doctors linked to this facility. Use Add doctor to link an
              existing profile.
            </p>
          ) : !visible.length ? (
            <div>
              <p role="status">No doctors match your filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSpecialty('');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className={styles.list}>
              {visible.map((doctor) => {
                const slots = getAppointmentSlots(
                  workspaceFacility.id,
                  doctor.id,
                );
                return (
                  <li key={doctor.id}>
                    <h3>{doctor.name}</h3>
                    <p>{doctor.specialty}</p>
                    <p className={styles.status}>
                      Affiliated with this facility (preview)
                    </p>
                    <p className={styles.note}>
                      {slots.length
                        ? `${slots.length} sample available slots; next date ${formatSlotDate(slots[0].date)}. Availability is provisional.`
                        : 'No availability information for this facility yet.'}
                    </p>
                    <button
                      type="button"
                      aria-expanded={removing === doctor.id}
                      onClick={() => {
                        setRemoving(doctor.id);
                        setMessage('');
                      }}
                    >
                      Remove affiliation
                      <span className="visually-hidden">
                        {' '}
                        for {doctor.name}
                      </span>
                    </button>
                    {removing === doctor.id && (
                      <div
                        className={styles.panel}
                        role="group"
                        aria-label={`Confirm removal of ${doctor.name}`}
                      >
                        <p>
                          Remove {doctor.name} from this facility’s provider
                          list? Their account and any other facility
                          affiliations are not deleted.
                        </p>
                        <button type="button" onClick={() => setRemoving(null)}>
                          Keep affiliation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            save(
                              affiliatedIds.filter((id) => id !== doctor.id),
                              `${doctor.name} removed from this facility’s local list.`,
                            );
                            setRemoving(null);
                            addButton.current?.focus();
                          }}
                        >
                          Confirm removal (preview)
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
