'use client';
import Link from 'next/link';
import { useState } from 'react';
import { adminSnapshot as data, formatAdminDate } from '../data/admin';
import styles from './AdminDashboard.module.css';

type State = 'ready' | 'loading' | 'empty' | 'error';
export default function AdminDashboard() {
  const [state, setState] = useState<State>('ready');
  // TODO: Fetch dashboard counts, applications and audit activity from the
  // backend after enforcing the signed-in admin's permissions on the server.
  const applications = state === 'empty' ? [] : data.applications;
  const activity = state === 'empty' ? [] : data.activity;
  const metrics = [
    {
      label: 'Applications awaiting review',
      value: data.awaitingReview,
      href: '/admin/facilities',
      link: 'View applications',
    },
    {
      label: 'Active facilities',
      value: data.activeFacilities,
      href: '/admin/facilities',
      link: 'View facilities',
    },
    {
      label: 'Affiliated doctors',
      value: data.affiliatedDoctors,
      href: '/admin/doctors',
      link: 'View doctors',
    },
    {
      label: 'Upcoming appointment slots',
      value: data.upcomingSlots,
      href: '/admin/slots',
      link: 'View slots',
    },
  ];
  return (
    <section aria-labelledby="admin-dashboard-title">
      <h2 id="admin-dashboard-title">Dashboard</h2>
      <p className={styles.note}>
        Sample snapshot: {formatAdminDate(data.asOf)} IST. Upcoming slots cover
        the next 7 days. Doctors are counted once across facilities.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.preview}>
          <label htmlFor="admin-state">Development state preview</label>
          <select
            id="admin-state"
            value={state}
            onChange={(event) => setState(event.target.value as State)}
          >
            <option value="ready">Overview</option>
            <option value="loading">Loading</option>
            <option value="empty">Empty platform</option>
            <option value="error">Error</option>
          </select>
        </div>
      )}
      {state === 'loading' ? (
        <div aria-busy="true" className={styles.loading}>
          <p role="status">Loading platform dashboard…</p>
          <div className={styles.metrics} aria-hidden="true">
            {metrics.map((metric) => (
              <div className={styles.skeleton} key={metric.label} />
            ))}
          </div>
        </div>
      ) : state === 'error' ? (
        <div className={styles.panel}>
          <div role="alert">
            <h3>We couldn’t load the dashboard</h3>
            <p>
              Platform counts, applications and recent activity are unavailable.
              Please try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // TODO: Retry the authorized backend dashboard query.
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
              <Link
                className={styles.metric}
                href={metric.href}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{state === 'empty' ? 0 : metric.value}</strong>
                <span>{metric.link} →</span>
              </Link>
            ))}
          </div>
          <section
            className={styles.panel}
            aria-labelledby="admin-review-title"
          >
            <div className={styles.heading}>
              <div>
                <h3 id="admin-review-title">Facility review queue</h3>
                <p className={styles.note}>
                  Recent clinic and hospital applications, newest first.
                </p>
              </div>
              <Link href="/admin/facilities">View all applications →</Link>
            </div>
            {applications.length ? (
              <ul className={styles.list}>
                {applications.map((item) => (
                  <li key={item.id}>
                    <h4>{item.name}</h4>
                    <p>
                      {item.type} · {item.location}
                    </p>
                    <div className={styles.meta}>
                      <span>
                        Submitted{' '}
                        <time dateTime={item.submittedAt}>
                          {formatAdminDate(item.submittedAt)} IST
                        </time>
                      </span>
                      <span className={styles.status} data-status={item.status}>
                        {item.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty} role="status">
                No applications to review. New facility submissions will appear
                here.
              </p>
            )}
          </section>
          <section
            className={styles.panel}
            aria-labelledby="admin-activity-title"
          >
            <div className={styles.heading}>
              <div>
                <h3 id="admin-activity-title">Recent activity</h3>
                <p className={styles.note}>
                  Example admin actions from the fictional audit history.
                </p>
              </div>
              <Link href="/admin/audit">View audit log →</Link>
            </div>
            {activity.length ? (
              <ol className={styles.list}>
                {activity.map((item) => (
                  <li key={item.id}>
                    <h4>{item.action}</h4>
                    <p>{item.detail}</p>
                    <div className={styles.meta}>
                      <time dateTime={item.at}>
                        {formatAdminDate(item.at)} IST
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.empty} role="status">
                No admin activity yet. Recorded actions will appear here.
              </p>
            )}
          </section>
          <p className={styles.accessLink}>
            <Link href="/admin/users">View users & roles →</Link>
          </p>
        </>
      )}
    </section>
  );
}
