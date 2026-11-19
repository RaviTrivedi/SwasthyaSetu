'use client';
import { useRef, useState, type FormEvent } from 'react';
import { profilePayload, workspaceApi, type Facility } from '../api';
import styles from '../WorkspaceForms.module.css';
const fields = [
  ['facilityName','Facility name',200,'text'], ['contactPersonName','Contact person',100,'text'],
  ['contactEmail','Contact email',254,'email'], ['contactPhone','Contact phone',16,'tel'],
  ['address','Address',500,'text'], ['city','City',100,'text'],
] as const;
export default function FacilityProfileEditor({ profile, onSave }: { profile: Facility; onSave: (profile: Facility) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const lock = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    setError(''); setMessage('');
    try {
      const form = new FormData(event.currentTarget);
      const changedServices = String(form.get('services') ?? '') !== profile.services.join('\n');
      const input = profilePayload(form, changedServices);
      lock.current = true; setBusy(true);
      const saved = await workspaceApi.updateProfile(input); onSave(saved); setMessage('Facility profile saved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save the profile.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.panel}><h2>Facility profile</h2><form key={profile.updatedAt} onSubmit={submit}><fieldset disabled={busy}><div className={styles.fields}>
    {fields.map(([key,label,max,type]) => <label key={key}>{label}<input name={key} type={type} maxLength={max} required defaultValue={profile[key]} /></label>)}
    <label>Facility type<select name="facilityType" defaultValue={profile.facilityType}><option value="CLINIC">Clinic</option><option value="HOSPITAL">Hospital</option></select></label>
  </div><p>Phone format: + followed by 8–15 digits, without spaces.</p>
  <label>Description<textarea name="description" maxLength={2000} defaultValue={profile.description ?? ''} /></label>
  <label>Offered services (one per line, up to 50)<textarea name="services" rows={5} defaultValue={profile.services.join('\n')} /></label>
  <button type="submit">{busy ? 'Saving...' : 'Save profile'}</button></fieldset></form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
