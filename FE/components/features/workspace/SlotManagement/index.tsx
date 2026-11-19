'use client';
import { useRef, useState, type FormEvent } from 'react';
import { workspaceApi, WorkspaceApiError, slotQuery, type Slots } from '../api';
import { useResource } from '../use-resource';
import OpeningHours from '../OpeningHours';
import styles from '../WorkspaceForms.module.css';
async function loadSchedule() {
  try { return { schedule: await workspaceApi.hours() }; }
  catch (error) {
    if (!(error instanceof WorkspaceApiError) || error.status !== 404) throw error;
    // Distinguish a missing schedule from a missing/revoked facility.
    await workspaceApi.profile(); return { schedule: null };
  }
}
function dateInZone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year','month','day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
function SlotList({ timezone }: { timezone: string }) {
  const [from, setFrom] = useState(() => dateInZone(timezone)), [to, setTo] = useState(() => dateInZone(timezone));
  const [data, setData] = useState<Slots | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  async function load(event?: FormEvent) {
    event?.preventDefault(); if (lock.current) return;
    setError(''); setData(null);
    try {
      slotQuery(from,to); lock.current = true; setBusy(true);
      setData(await workspaceApi.slots(from,to));
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load slots.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.panel}><h2>Generated slots</h2><p>Dates use {timezone}. Choose today or later, up to 31 days inclusive, within the next 365 days. Only future slots are returned.</p>
    <form onSubmit={load}><fieldset disabled={busy}><div className={styles.actions}><label>From<input type="date" required value={from} onChange={event => { setFrom(event.target.value); setData(null); }} /></label><label>To<input type="date" required value={to} onChange={event => { setTo(event.target.value); setData(null); }} /></label><button type="submit">{busy ? 'Loading...' : 'Load slots'}</button></div></fieldset></form>
    {busy && <p role="status">Generating and loading slots...</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => void load()}>Retry</button></div>}
    {!data && !busy && !error && <p>Select a date range and load slots.</p>}
    {data && <><p role="status">{data.slots.length} slots · {data.intervalMinutes}-minute interval · {data.timezone}</p>
      {!data.slots.length ? <p>No future slots in this range. Check opening hours or choose another date.</p> : <div className={styles.table}><table><caption>Facility appointment slots</caption><thead><tr><th scope="col">Start</th><th scope="col">End</th><th scope="col">Status</th></tr></thead><tbody>{data.slots.map(slot => <tr key={slot.id}><td><time dateTime={slot.startsAt}>{new Date(slot.startsAt).toLocaleString('en-IN', { timeZone: data.timezone })}</time></td><td><time dateTime={slot.endsAt}>{new Date(slot.endsAt).toLocaleString('en-IN', { timeZone: data.timezone })}</time></td><td>{slot.booked ? 'Booked' : 'Available'}</td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}
export default function SlotManagement() {
  const resource = useResource(loadSchedule); const [revision, setRevision] = useState(0);
  if (resource.loading) return <p role="status">Loading opening hours...</p>;
  if (resource.error) return <section role="alert"><p>{resource.error.message}</p><button onClick={resource.retry}>Retry</button></section>;
  if (!resource.data) return null;
  return <><OpeningHours initial={resource.data.schedule} onSave={schedule => { resource.setData({ schedule }); setRevision(value => value + 1); }} />
    {resource.data.schedule ? <SlotList key={revision} timezone={resource.data.schedule.timezone} /> : <p>Save opening hours before generating slots.</p>}
  </>;
}
