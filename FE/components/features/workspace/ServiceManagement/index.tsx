'use client';
import { useRef, useState, type FormEvent } from 'react';
import { workspaceApi, type Service } from '../api';
import { useResource } from '../use-resource';
import styles from '../WorkspaceForms.module.css';

export default function ServiceManagement({ onChange }: { onChange: (names: string[]) => void }) {
  const resource = useResource(workspaceApi.services);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const lock = useRef(false);
  async function mutate(action: () => Promise<Service[]>, success: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { const rows = await action(); resource.setData(rows); onChange(rows.map(row => row.name)); setMessage(success); setDeleting(null); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update services.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>, existing?: Service) {
    event.preventDefault(); const form = event.currentTarget; const name = String(new FormData(form).get('name') ?? '');
    void mutate(async () => {
      const saved = existing ? await workspaceApi.updateService(existing.id, name) : await workspaceApi.addService(name);
      if (!existing) form.reset();
      return existing ? resource.data!.map(row => row.id === saved.id ? saved : row) : [...resource.data!, saved];
    }, existing ? 'Service updated.' : 'Service added.');
  }
  return <section className={styles.panel}><h2>Services</h2>
    {resource.loading ? <p role="status">Loading services...</p> : resource.error ? <div role="alert"><p>{resource.error.message}</p><button onClick={resource.retry}>Retry</button></div> : resource.data && <fieldset disabled={busy}>
      <legend>Offered services</legend>
      {!resource.data.length && <p>No services added yet.</p>}
      {resource.data.map(row => <div key={`${row.id}-${row.updatedAt}`}>
        <form onSubmit={event => save(event, row)}><label>Service name<input name="name" required maxLength={100} defaultValue={row.name} /></label><div className={styles.actions}><button type="submit">Save service</button><button type="button" onClick={() => setDeleting(row.id)}>Remove</button></div></form>
        {deleting === row.id && <div><p>Remove {row.name} from offered services?</p><button onClick={() => void mutate(async () => { await workspaceApi.removeService(row.id); return resource.data!.filter(item => item.id !== row.id); }, 'Service removed.')}>Confirm removal</button><button onClick={() => setDeleting(null)}>Keep service</button></div>}
      </div>)}
      <h3>Add service</h3><form onSubmit={event => save(event)}><label>New service name<input name="name" required maxLength={100} /></label><button disabled={resource.data.length >= 50} type="submit">Add service</button></form>
      {resource.data.length >= 50 && <p>The facility has reached the 50-service limit.</p>}
    </fieldset>}
    {busy && <p role="status">Saving service changes...</p>}{error && <p role="alert">{error} <button onClick={resource.retry}>Reload services</button></p>}{message && <p role="status">{message}</p>}
  </section>;
}
