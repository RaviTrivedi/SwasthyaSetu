'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  directoryApi,
  directoryQuery,
  type DirectorySection,
  type DirectoryPage,
} from '../directory-api';
import styles from '../FacilityApplications/FacilityApplications.module.css';
import local from './AdminDirectory.module.css';

const titles = {
  doctors: 'Doctors',
  slots: 'Appointment Slots',
  users: 'Users & Roles',
};
function date(value: string, timezone = 'UTC') {
  try {
    return new Date(value).toLocaleString('en-IN', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return new Date(value).toISOString();
  }
}
function Results({
  section,
  query,
  navigate,
}: {
  section: DirectorySection;
  query: string;
  navigate: (page: number) => void;
}) {
  const [result, setResult] = useState<DirectoryPage | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    directoryApi(section, query)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : 'Unable to connect. Please retry.',
          );
      });
    return () => {
      active = false;
    };
  }, [section, query, attempt]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button
          onClick={() => {
            setError('');
            setResult(null);
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  if (!result)
    return <p role="status">Loading {titles[section].toLowerCase()}...</p>;
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <>
      <p role="status">{result.total} records found</p>
      {result.items.length === 0 ? (
        <p>No records match these filters on this page.</p>
      ) : (
        <div className={styles.table}>
          <table>
            <caption>{titles[section]} — read-only records</caption>
            <thead>
              <tr>
                {(section === 'slots'
                  ? ['Facility', 'Start', 'End', 'Availability', 'Appointment']
                  : section === 'doctors'
                    ? [
                      'Doctor / owner',
                      'Account',
                      'Joined (UTC)',
                      'Applications and facilities',
                    ]
                    : ['User', 'Role', 'Account', 'Joined (UTC)']
                ).map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) =>
                'startsAt' in item ? (
                  <tr key={item.id}>
                    <td>
                      {item.facility.facilityName}
                      <br />
                      <small>
                        {item.facility.timezone ??
                          'UTC (facility timezone not set)'}
                      </small>
                    </td>
                    <td>
                      <time dateTime={item.startsAt}>
                        {date(item.startsAt, item.facility.timezone ?? 'UTC')}
                      </time>
                    </td>
                    <td>
                      <time dateTime={item.endsAt}>
                        {date(item.endsAt, item.facility.timezone ?? 'UTC')}
                      </time>
                    </td>
                    <td>{item.status}</td>
                    <td>{item.appointmentStatus ?? 'No linked appointment'}</td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    <td>
                      {item.firstName}
                      <br />
                      <small>{item.email}</small>
                    </td>
                    {section === 'users' && <td>{item.role}</td>}
                    <td>{item.disabledAt ? 'Disabled' : 'Active'}</td>
                    <td>
                      <time dateTime={item.createdAt}>
                        {date(item.createdAt)}
                      </time>
                    </td>
                    {'applications' in item && (
                      <td>
                        {item.applications.length === 0 ? (
                          'No applications submitted'
                        ) : (
                          <ul className={local.applications}>
                            {item.applications.map((application) => (
                              <li key={application.id}>
                                <Link
                                  href={`/admin/facilities/${encodeURIComponent(application.id)}`}
                                >
                                  {application.facilityName}
                                </Link>{' '}
                                — {application.status}
                                <br />
                                <small>
                                  {application.facility
                                    ? `${application.facility.facilityName} (${application.facility.facilityType})`
                                    : 'Facility profile not created'}
                                </small>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <nav className={styles.actions} aria-label={`${titles[section]} pages`}>
        <button
          disabled={result.page <= 1}
          onClick={() => navigate(result.page - 1)}
        >
          Previous
        </button>
        <span>
          Page {result.page} of {pages}
        </span>
        <button
          disabled={result.page >= pages || result.page >= 100000}
          onClick={() => navigate(result.page + 1)}
        >
          Next
        </button>
      </nav>
    </>
  );
}
export default function AdminDirectory({
  section,
}: {
  section: DirectorySection;
}) {
  const [query, setQuery] = useState('page=1&pageSize=20');
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setQuery(directoryQuery(section, new FormData(event.currentTarget)));
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Check your filters.');
    }
  }
  function navigate(page: number) {
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    setQuery(params.toString());
  }
  const filter =
    section === 'doctors'
      ? 'applicationStatus'
      : section === 'users'
        ? 'role'
        : 'status';
  const choices =
    section === 'doctors'
      ? ['PENDING', 'APPROVED', 'REJECTED']
      : section === 'users'
        ? ['PATIENT', 'ADMIN', 'DOCTOR']
        : ['AVAILABLE', 'BOOKED', 'UNAVAILABLE'];
  return (
    <section className={styles.panel}>
      <h2>{titles[section]}</h2>
      <p>
        {section === 'doctors'
          ? 'Clinic and hospital owners, their applications and facility profiles.'
          : section === 'users'
            ? 'View account details and current roles. Role changes are not available here.'
            : 'Persisted slots only. Slot times use the facility timezone shown; date filters use UTC.'}
      </p>
      <form key={formKey} onSubmit={apply} className={local.filters}>
        <label>
          {section === 'doctors'
            ? 'Application status'
            : section === 'users'
              ? 'Role'
              : 'Availability'}
          <select name={filter}>
            <option value="">All</option>
            {choices.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {section === 'slots' && (
          <>
            <label>
              From (UTC, inclusive)
              <input type="datetime-local" name="from" />
            </label>
            <label>
              To (UTC, exclusive)
              <input type="datetime-local" name="to" />
            </label>
          </>
        )}
        <button type="submit">Apply filters</button>
        <button
          type="button"
          onClick={() => {
            setFormKey((value) => value + 1);
            setQuery('page=1&pageSize=20');
            setError('');
          }}
        >
          Clear filters
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <Results
        key={`${section}-${query}`}
        section={section}
        query={query}
        navigate={navigate}
      />
    </section>
  );
}
