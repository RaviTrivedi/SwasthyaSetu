'use client';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import { applicationApi, ApplicationApiError, reviewPayload, type FacilityApplication } from '../applications-api';
import { displayDate } from './index';
import styles from './FacilityApplications.module.css';
export default function ApplicationDetail({ id }: { id: string }) {
 const [item, setItem] = useState<FacilityApplication | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
 const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [attempt, setAttempt] = useState(0);
 const submitting = useRef(false); const alive = useRef(false);
 useEffect(() => { alive.current = true; let active = true;
  applicationApi.detail(id).then(data => { if (active) setItem(data); }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Unable to load this application.'); });
  return () => { active = false; alive.current = false; };
 }, [id, attempt]);
 async function review(status: 'APPROVED' | 'REJECTED') {
  if (submitting.current || item?.status !== 'PENDING') return;
  try { reviewPayload(status, reason); } catch (error) { setError((error as Error).message); return; }
  submitting.current = true; setBusy(true); setError(''); setMessage('');
  try {
   const updated = await applicationApi.review(id, status, reason);
   if (!alive.current) return;
   setItem(updated); setReason(''); setMessage(status === 'APPROVED' ? 'Application approved.' : 'Application rejected.');
   // Fetch authoritative details after a review. Keep controls locked if refreshing fails.
   try { const latest = await applicationApi.detail(id); if (alive.current) setItem(latest); }
   catch { if (alive.current) { setItem(null); setError('Review saved, but the latest details could not be loaded. Retry to refresh.'); } }
  } catch (error) {
   if (!alive.current) return;
   setError(error instanceof Error ? error.message : 'Unable to submit review.');
   // A conflict or lost response may mean another review committed. Never offer stale actions.
   setItem(null);
   if (error instanceof ApplicationApiError && error.status === 409) {
    try { const latest = await applicationApi.detail(id); if (alive.current) setItem(latest); }
    catch { /* Retry remains available; do not restore stale PENDING data. */ }
   }
  } finally { submitting.current = false; if (alive.current) setBusy(false); }
 }
 const fields = item ? [
  ['Facility type', item.facilityType], ['Status', item.status], ['Contact person', item.contactPersonName], ['Contact email', item.contactEmail], ['Contact phone', item.contactPhone], ['Address', item.address], ['City', item.city], ['Description', item.description || 'Not provided'],
  ['Applicant name', item.applicant.firstName], ['Applicant email', item.applicant.email], ['Applicant ID', item.applicant.id],
  ['Submitted', displayDate(item.createdAt)], ['Updated', displayDate(item.updatedAt)], ['Reviewed at', displayDate(item.reviewedAt)], ['Reviewing Admin ID', item.reviewedByAdminId || 'Not reviewed'], ['Rejection reason', item.rejectionReason || 'Not provided'],
 ] : [];
 return <section className={styles.panel} aria-busy={busy}><Link href="/admin/facilities">Back to applications</Link><h2>{item?.facilityName ?? 'Application details'}</h2>
 {message && <p role="status">{message}</p>}
 {error && <div role="alert"><p>{error}</p>{!item && <button disabled={busy} onClick={() => { setError(''); setAttempt(value => value + 1); }}>Retry</button>}</div>}
 {!item && !error && <p role="status">Loading application details...</p>}
 {item && <><dl className={styles.details}>{fields.map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>)}</dl><h3>Offered services</h3><ul className={styles.services}>{item.services.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ul>
 {item.status === 'PENDING' ? <fieldset className={styles.review} disabled={busy}><legend>Review application</legend><label htmlFor="rejection-reason">Rejection reason (required to reject)</label><textarea id="rejection-reason" rows={4} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /><p>{reason.length}/2000 characters</p><div className={styles.actions}><button type="button" onClick={() => void review('APPROVED')}>Approve application</button><button type="button" disabled={!reason.trim()} onClick={() => void review('REJECTED')}>Reject application</button></div>{busy && <p role="status">Saving review...</p>}</fieldset> : <p>This application has been reviewed. No further review actions are available.</p>}
 </>}
 </section>;
}
