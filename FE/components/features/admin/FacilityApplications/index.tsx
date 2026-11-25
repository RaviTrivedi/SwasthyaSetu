'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    applicationApi,
    type ApplicationPage,
    type ApplicationStatus,
} from '../applications-api';
import styles from './FacilityApplications.module.css';
export const displayDate = (date: string | null) =>
    date && Number.isFinite(Date.parse(date))
        ? new Date(date).toLocaleString('en-IN')
        : 'Not recorded';
function Results({
    page,
    status,
    changePage,
}: {
    page: number;
    status: ApplicationStatus | '';
    changePage: (page: number) => void;
}) {
    const [result, setResult] = useState<ApplicationPage | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        applicationApi
            .list(page, status)
            .then((data) => {
                if (active) setResult(data);
            })
            .catch((error) => {
                if (active)
                    setError(
                        error instanceof Error
                            ? error.message
                            : 'Unable to connect. Please try again.',
                    );
            });
        return () => {
            active = false;
        };
    }, [page, status, attempt]);
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
    if (!result) return <p role="status">Loading facility applications...</p>;
    const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
    return (
        <>
            <p>
                {result.total} applications{' '}
                {status ? `with status ${status}` : 'in total'}
            </p>
            {result.items.length === 0 ? (
                <p>No applications found on this page.</p>
            ) : (
                <div className={styles.table}>
                    <table>
                        <caption>Facility applications for review</caption>
                        <thead>
                            <tr>
                                <th>Facility</th>
                                <th>Applicant</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Review</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.items.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        {item.facilityName}
                                        <br />
                                        {item.facilityType} · {item.city}
                                    </td>
                                    <td>
                                        {item.applicant.firstName}
                                        <br />
                                        {item.applicant.email}
                                    </td>
                                    <td>{item.status}</td>
                                    <td>{displayDate(item.createdAt)}</td>
                                    <td>
                                        <Link href={`/admin/facilities/${item.id}`}>
                                            View
                                            <span className={styles.srOnly}>
                                                {' '}
                                                for {item.facilityName}
                                            </span>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <nav className={styles.actions} aria-label="Application pages">
                <button disabled={page <= 1} onClick={() => changePage(page - 1)}>
                    Previous
                </button>
                <span>
                    Page {result.page} of {pages}
                </span>
                <button
                    disabled={page >= pages || page >= 100000}
                    onClick={() => changePage(page + 1)}
                >
                    Next
                </button>
            </nav>
        </>
    );
}
export default function FacilityApplications({
    dashboard = false,
}: {
    dashboard?: boolean;
}) {
    const query = useSearchParams();
    const router = useRouter();
    const rawPage = query.get('page') ?? '1';
    const page =
        /^[1-9]\d*$/.test(rawPage) && Number(rawPage) <= 100000
            ? Number(rawPage)
            : 1;
    const rawStatus = query.get('status') ?? (dashboard ? 'PENDING' : '');
    const status: ApplicationStatus | '' =
        rawStatus === 'PENDING' ||
            rawStatus === 'APPROVED' ||
            rawStatus === 'REJECTED'
            ? rawStatus
            : '';
    function navigate(nextPage: number, nextStatus = status) {
        const params = new URLSearchParams({
            page: String(nextPage),
            ...(nextStatus ? { status: nextStatus } : {}),
        });
        router.push(`/admin/facilities?${params}`);
    }
    return (
        <section className={styles.panel}>
            <h2>
                {dashboard ? 'Applications awaiting review' : 'Facility applications'}
            </h2>
            <p>Review submitted clinic and hospital applications.</p>
            <label className={styles.filter}>
                Status{' '}
                <select
                    value={status}
                    onChange={(event) =>
                        navigate(1, event.target.value as ApplicationStatus | '')
                    }
                >
                    <option value="">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </label>
            <Results
                key={`${page}-${status}`}
                page={page}
                status={status}
                changePage={navigate}
            />
        </section>
    );
}
