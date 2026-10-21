'use client';
import { useState } from 'react';
import {
  hasRequestConflict,
  workspaceDoctors,
  type WorkspaceRequest,
} from '../data/workspace';
import RequestActions from '../RequestActions';
import StaffRequestDetails from '../StaffRequestDetails';
import styles from './WorkspaceRequests.module.css';

export default function WorkspaceRequests({
  requests,
  setRequests,
}: {
  requests: WorkspaceRequest[];
  setRequests: (requests: WorkspaceRequest[]) => void;
}) {
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [state, setState] = useState('ready');
  // TODO: Load requests from backend with organization and user permission checks.
  function decide(id: string, decision: 'Confirmed' | 'Rejected') {
    const request = requests.find((item) => item.id === id);
    if (!request || request.status !== 'Pending') return;
    if (decision === 'Confirmed' && hasRequestConflict(request, requests)) {
      setMessage(
        'Approval blocked: this slot conflicts with a confirmed appointment.',
      );
      return;
    }
    // TODO: Submit decision to backend. Backend MUST revalidate permissions and
    // slot availability atomically before accepting approval or rejection.
    setRequests(
      requests.map((item) =>
        item.id === id ? { ...item, status: decision } : item,
      ),
    );
    setMessage(
      `${request.patient}: ${decision} in this local preview only. Nothing was saved permanently and no patient was notified.`,
    );
  }
  function actions(request: WorkspaceRequest) {
    return (
      <RequestActions
        request={request}
        conflict={hasRequestConflict(request, requests)}
        onDecision={decide}
      />
    );
  }
  const selected = requests.find((item) => item.id === selectedId);
  const visible = (state === 'empty' ? [] : requests).filter(
    (item) =>
      (status === 'All' || item.status === status) &&
      item.patient.toLowerCase().includes(search.trim().toLowerCase()) &&
      (!doctor || (item.doctor ?? 'any') === doctor) &&
      (!date || item.startsAt.startsWith(date)),
  );
  return (
    <>
      <p role="status" className={styles.message}>
        {message}
      </p>
      {selectedId ? (
        <StaffRequestDetails
          request={selected}
          onBack={() => setSelectedId(null)}
        >
          {selected && actions(selected)}
        </StaffRequestDetails>
      ) : (
        <section>
          <h2>Appointment requests</h2>
          <p>
            New bookings need clinic approval. All decisions here are temporary
            mock changes.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <label className={styles.preview}>
              Development state preview
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                <option value="ready">Requests</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Error</option>
              </select>
            </label>
          )}
          <div className={styles.tabs} aria-label="Request status filters">
            {['All', 'Pending', 'Confirmed', 'Rejected'].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {value} (
                {
                  requests.filter(
                    (item) => value === 'All' || item.status === value,
                  ).length
                }
                )
              </button>
            ))}
          </div>
          <div className={styles.filters}>
            <label>
              Patient name
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Doctor
              <select
                value={doctor}
                onChange={(event) => setDoctor(event.target.value)}
              >
                <option value="">All doctors</option>
                <option value="any">Any available doctor</option>
                {workspaceDoctors.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              Requested date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>
          {state === 'loading' ? (
            <p role="status" aria-busy="true">
              Loading requests...
            </p>
          ) : state === 'error' ? (
            <div>
              <p role="alert">We couldn’t load requests.</p>
              <button type="button" onClick={() => setState('ready')}>
                Try again
              </button>
            </div>
          ) : !visible.length ? (
            <div>
              <h3>
                No matching {status === 'All' ? '' : status.toLowerCase()}{' '}
                requests
              </h3>
              <p>Try another status, patient name, doctor or date.</p>
              <button
                type="button"
                onClick={() => {
                  setStatus('All');
                  setSearch('');
                  setDoctor('');
                  setDate('');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className={styles.list}>
              {visible.map((request) => (
                <li key={request.id}>
                  <h3>{request.patient}</h3>
                  <p>
                    {request.doctor ?? 'Any available doctor'} ·{' '}
                    {request.service}
                  </p>
                  <time dateTime={request.startsAt}>
                    {new Intl.DateTimeFormat('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(request.startsAt))}{' '}
                    IST
                  </time>
                  <p className={styles.status}>
                    {request.status === 'Pending'
                      ? 'Pending clinic approval'
                      : request.status}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(request.id);
                      setMessage('');
                    }}
                  >
                    View details
                    <span className="visually-hidden">
                      {' '}
                      for {request.patient}
                    </span>
                  </button>
                  {actions(request)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
