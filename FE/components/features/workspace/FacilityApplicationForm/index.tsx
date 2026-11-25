'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiRequest, doctorAccess, type DoctorAccess } from '../../auth/api';
import { profilePayload } from '../api';
import styles from '../WorkspaceForms.module.css';

const fields = [
  ['facilityName', 'Facility name', 200, 'text'],
  ['contactPersonName', 'Contact person', 100, 'text'],
  ['contactEmail', 'Contact email', 254, 'email'],
  ['contactPhone', 'Contact phone', 16, 'tel'],
  ['address', 'Address', 500, 'text'],
  ['city', 'City', 100, 'text'],
] as const;

export default function FacilityApplicationForm() {
  const [access, setAccess] = useState<DoctorAccess | null>(null);
  const [loadError, setLoadError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    doctorAccess()
      .then((value) => {
        if (active) setAccess(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const createProfile = access?.approvedCount === 1 && !access.profileAvailable;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    try {
      const body = profilePayload(new FormData(event.currentTarget));
      lock.current = true;
      setBusy(true);
      const response = await apiRequest(
        createProfile ? '/facilities/me' : '/facilities/applications',
        { method: 'POST', body },
      );
      if (response.status !== 201)
        throw new Error(
          response.status === 401
            ? 'Your session expired. Please sign in again.'
            : response.status === 400
              ? 'Check the facility details and try again.'
              : response.status === 409
                ? 'Your application or profile has changed. Check your application status.'
                : 'Unable to submit. Check your application status before trying again.',
        );
      setDone(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to submit.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (loadError)
    return (
      <section role="alert">
        <p>Unable to check your application status.</p>
        <button
          onClick={() => {
            setLoadError(false);
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </button>
      </section>
    );
  if (!access) return <p role="status">Loading your application status...</p>;
  if (done)
    return (
      <section className={styles.panel}>
        <h1>
          {createProfile ? 'Facility profile created' : 'Application submitted'}
        </h1>
        <p role="status">
          {createProfile
            ? 'Your approved facility is now available in the marketplace.'
            : 'Your clinic/hospital is pending Admin review. It will not appear publicly until approved and its profile is created.'}
        </p>
        <Link
          href={createProfile ? '/workspace' : '/doctor/application-status'}
        >
          Continue
        </Link>
      </section>
    );
  if (
    access.approvedCount > 1 ||
    access.profileAvailable ||
    (!createProfile &&
      access.applications.some((item) => item.status === 'PENDING'))
  )
    return (
      <section className={styles.panel}>
        <h1>Facility application</h1>
        <p>
          {access.approvedCount > 1
            ? 'Multiple approved applications exist. Contact the administrator to resolve access.'
            : access.profileAvailable
              ? 'Your facility already has a profile. Manage it from your workspace.'
              : 'Your application is already pending Admin review.'}
        </p>
        <Link
          href={
            access.profileAvailable
              ? '/workspace'
              : '/doctor/application-status'
          }
        >
          View status or workspace
        </Link>
      </section>
    );
  return (
    <section className={styles.panel}>
      <h1>
        {createProfile
          ? 'Create your approved facility profile'
          : 'Add a clinic or hospital'}
      </h1>
      <p>
        {createProfile
          ? 'Complete the public details for your approved application.'
          : 'Submit your facility details for Admin review. Approval is required before public listing.'}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className={styles.fields}>
            {fields.map(([name, label, maxLength, type]) => (
              <label key={name}>
                {label}
                <input name={name} type={type} required maxLength={maxLength} />
              </label>
            ))}
            <label>
              Facility type
              <select name="facilityType">
                <option value="CLINIC">Clinic</option>
                <option value="HOSPITAL">Hospital</option>
              </select>
            </label>
          </div>
          <p>Phone: + followed by 8-15 digits, with no spaces.</p>
          <label>
            Description (optional)
            <textarea name="description" maxLength={2000} />
          </label>
          <label>
            Specialties and services (one per line, up to 50)
            <textarea name="services" rows={5} required />
          </label>
          <button type="submit">
            {busy
              ? 'Submitting...'
              : createProfile
                ? 'Create public profile'
                : 'Submit for review'}
          </button>
        </fieldset>
      </form>
      {error && <p role="alert">{error}</p>}
      <Link href="/doctor/application-status">View application status</Link>
    </section>
  );
}
