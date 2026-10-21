'use client';

import { useState } from 'react';
import { demoToday, type WorkspaceRequest } from '../data/workspace';
import type { WorkspaceSection } from '../WorkspaceShell';
import styles from './WorkspaceDashboard.module.css';

type State = 'ready' | 'loading' | 'empty' | 'error';
export default function WorkspaceDashboard({
  onNavigate,
  requests: sourceRequests,
  activeDoctorCount,
}: {
  onNavigate: (section: WorkspaceSection) => void;
  requests: WorkspaceRequest[];
  activeDoctorCount: number;
}) {
  const [state, setState] = useState<State>('ready');
  // TODO: Fetch organization-scoped dashboard metrics and recent requests from
  // the backend after server-side permission checks. Never trust a mock role.
  const requests = state === 'empty' ? [] : sourceRequests;
  const metrics = [
    {
      title: 'Pending requests',
      value: requests.filter((item) => item.status === 'Pending').length,
      section: 'Appointment Requests',
    },
    {
      title: 'Appointments today',
      value: requests.filter(
        (item) =>
          item.status === 'Confirmed' && item.startsAt.startsWith(demoToday),
      ).length,
      section: 'Appointment Requests',
    },
    { title: 'Active doctors', value: activeDoctorCount, section: 'Doctors' },
  ] as const;
  return (
    <section aria-labelledby="dashboard-title">
      <h2 id="dashboard-title">Dashboard</h2>
      <p className={styles.note}>
        Sample overview for 20 October 2026 · Asia/Kolkata. Today’s count
        includes confirmed appointments only.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.preview}>
          <label htmlFor="dashboard-state">Development state preview</label>
          <select
            id="dashboard-state"
            value={state}
            onChange={(event) => setState(event.target.value as State)}
          >
            <option value="ready">Overview</option>
            <option value="loading">Loading</option>
            <option value="empty">No requests</option>
            <option value="error">Error</option>
          </select>
        </div>
      )}
      {state === 'loading' ? (
        <div aria-busy="true">
          <p role="status">Loading dashboard...</p>
          <div className={styles.metrics} aria-hidden="true">
            {[0, 1, 2].map((id) => (
              <div className={styles.skeleton} key={id} />
            ))}
          </div>
        </div>
      ) : state === 'error' ? (
        <div className={styles.panel}>
          <div role="alert">
            <h3>We couldn’t load the dashboard</h3>
            <p>Please try again.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              // TODO: Retry the backend dashboard query here.
              setState('ready');
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className={styles.metrics}>
            {metrics.map((metric) => (
              <button
                type="button"
                className={styles.metric}
                key={metric.title}
                onClick={() => onNavigate(metric.section)}
              >
                <span>{metric.title}</span>
                <strong>{metric.value}</strong>
                <span>View {metric.section.toLowerCase()} →</span>
              </button>
            ))}
          </div>
          <section
            className={styles.panel}
            aria-labelledby="recent-requests-title"
          >
            <div className={styles.heading}>
              <h3 id="recent-requests-title">Recent appointment requests</h3>
              <button
                type="button"
                onClick={() => onNavigate('Appointment Requests')}
              >
                View all requests
              </button>
            </div>
            {requests.length ? (
              <ul className={styles.requests}>
                {requests.map((request) => (
                  <li key={request.id}>
                    <h4>{request.patient}</h4>
                    <p>{request.doctor ?? 'Any available doctor'}</p>
                    <time dateTime={request.startsAt}>
                      {new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(request.startsAt))}{' '}
                      IST
                    </time>
                    <span
                      className={styles.status}
                      data-status={request.status}
                    >
                      {request.status === 'Pending'
                        ? 'Pending clinic approval'
                        : request.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status">
                No appointment requests yet. New requests will appear here for
                clinic review.
              </p>
            )}
          </section>
          <div className={styles.actions}>
            <button type="button" onClick={() => onNavigate('Services')}>
              View services
            </button>
            <button
              type="button"
              onClick={() => onNavigate('Facility Profile')}
            >
              View facility profile
            </button>
          </div>
        </>
      )}
    </section>
  );
}
