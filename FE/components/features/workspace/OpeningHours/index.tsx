'use client';
import { useRef, useState, type FormEvent } from 'react';
import { workspaceApi, validateSchedule, type Schedule } from '../api';
import styles from '../WorkspaceForms.module.css';
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export default function OpeningHours({ initial, onSave }: { initial: Schedule | null; onSave: (schedule: Schedule) => void }) {
  const [draft, setDraft] = useState<Schedule>(() => initial ?? { timezone: '', days: days.map((_,day) => ({ day, periods: [] })) });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const lock = useRef(false);
  function periods(day: number, next: Schedule['days'][number]['periods']) { setDraft(value => ({ ...value, days: value.days.map(item => item.day === day ? { ...item, periods: next } : item) })); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (lock.current) return;
    setError(''); setMessage('');
    try {
      const input = validateSchedule({ ...draft, timezone: draft.timezone.trim() });
      lock.current = true; setBusy(true);
      const saved = await workspaceApi.saveHours(input); setDraft(saved); onSave(saved); setMessage('Opening hours saved. Existing booked slots are preserved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save opening hours.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.panel}><h2>Weekly opening hours</h2>
    {!initial && <p>No opening hours have been configured. Choose a timezone and open periods below.</p>}
    <p>Slots are always 30 minutes. For example, 09:00–11:00 produces 09:00, 09:30, 10:00 and 10:30. Shorter trailing periods produce no extra slot.</p>
    <p>Saving replaces the weekly schedule and removes future unbooked slots. Existing bookings and historical slots remain unchanged. Reload a date range below to generate current availability.</p>
    <form onSubmit={save}><fieldset disabled={busy}><legend>Schedule</legend>
      <label>Facility timezone (IANA)<input required maxLength={100} placeholder="Asia/Kolkata" value={draft.timezone} onChange={event => setDraft({ ...draft, timezone: event.target.value })} /></label>
      {[...draft.days].sort((a,b) => a.day - b.day).map(day => <fieldset key={day.day}><legend>{days[day.day]}</legend>
        {!day.periods.length && <p>Closed</p>}
        {day.periods.map((period,index) => <div className={styles.period} key={index}>
          <label>Opens<input type="time" required step={60} value={period.open} onChange={event => periods(day.day, day.periods.map((item,i) => i === index ? { ...item, open: event.target.value } : item))} /></label>
          <label>Closes<input type="time" required step={60} value={period.close} onChange={event => periods(day.day, day.periods.map((item,i) => i === index ? { ...item, close: event.target.value } : item))} /></label>
          <button type="button" aria-label={`Remove ${days[day.day]} period ${index + 1}`} onClick={() => periods(day.day, day.periods.filter((_,i) => i !== index))}>Remove period</button>
        </div>)}
        <button type="button" disabled={day.periods.length >= 12} onClick={() => periods(day.day, [...day.periods, { open: '', close: '' }])}>Add open period</button>
        {!!day.periods.length && <button type="button" onClick={() => periods(day.day, [])}>Mark closed</button>}
      </fieldset>)}
      <button type="submit">{busy ? 'Saving...' : 'Save opening hours'}</button>
    </fieldset></form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
