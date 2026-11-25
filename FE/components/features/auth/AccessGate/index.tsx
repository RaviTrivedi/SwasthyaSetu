'use client';
import Link from 'next/link';
import {
  usePathname,
  useRouter,
  useSearchParams,
  useSelectedLayoutSegment,
} from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { currentUser, doctorAccess, type DoctorAccess } from '../api';
import { allowedPage, pageRole, safeReturnPath } from '../access-policy';
import { useSession } from '../use-session';
import SessionLoader from '../SessionLoader';

function CheckAccess({
  children,
  path,
  destination,
}: {
  children: ReactNode;
  path: string;
  destination: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allowed' | 'error'>(
    'loading',
  );
  const [attempt, setAttempt] = useState(0);
  const [application, setApplication] = useState<DoctorAccess | null>(null);
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const required = pageRole(path);
        if (required === 'AUTH' || path === '/forbidden') {
          if (active) setState('allowed');
          return;
        }
        const user = await currentUser();
        if (!active) return;
        if (!user) {
          if (required === 'PUBLIC') {
            setState('allowed');
            return;
          }
          const role =
            required === 'DOCTOR' || required === 'ADMIN'
              ? required
              : 'PATIENT';
          const next = safeReturnPath(
            required === 'ADMIN'
              ? window.location.pathname + window.location.search
              : destination,
            role,
          );
          router.replace(
            `/sign-in?role=${role}${next ? `&returnTo=${encodeURIComponent(next)}` : ''}`,
          );
          return;
        }
        if (!allowedPage(user.role, path)) {
          router.replace('/forbidden');
          return;
        }
        if (user.role === 'DOCTOR') {
          const access = await doctorAccess();
          if (!active) return;
          const ready = access.approvedCount === 1 && access.profileAvailable;
          if (
            !ready &&
            path !== '/doctor/application-status' &&
            path !== '/doctor/add-facility'
          ) {
            router.replace('/doctor/application-status');
            return;
          }
          if (ready && path === '/doctor/application-status') {
            router.replace('/workspace');
            return;
          }
          setApplication(access);
        }
        setState('allowed');
      } catch {
        if (active) setState('error');
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [path, destination, router, attempt]);
  if (state === 'loading') return <SessionLoader />;
  if (state === 'error')
    return (
      <section role="alert">
        <p>Unable to verify access. Please try again.</p>
        <button
          onClick={() => {
            setState('loading');
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </button>
      </section>
    );
  if (path === '/doctor/application-status' && application)
    return (
      <section>
        <h1>Facility application status</h1>
        <Link href="/doctor/add-facility">
          Add clinic/hospital or complete your approved profile
        </Link>
        {application.approvedCount > 1 ? (
          <p>
            Multiple approved applications exist. Contact the platform
            administrator to resolve workspace access.
          </p>
        ) : application.approvedCount === 1 ? (
          <p>
            Your application is approved. Create your facility profile before
            opening the workspace.
          </p>
        ) : application.applications.length === 0 ? (
          <p>You have not submitted a facility application yet.</p>
        ) : null}
        {application.applications.map((item) => (
          <article key={item.id}>
            <h2>{item.facilityName}</h2>
            <p>
              {item.status === 'PENDING'
                ? 'Your application is pending review.'
                : item.status === 'REJECTED'
                  ? 'Your application was rejected. Contact the platform administrator for next steps.'
                  : 'Your application is approved.'}
            </p>
          </article>
        ))}
      </section>
    );
  return children;
}
export function AdminAccess({ children }: { children: ReactNode }) {
  const { user, error, retry } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (user === null) {
      const next = safeReturnPath(
        window.location.pathname + window.location.search,
        'ADMIN',
      );
      router.replace(
        `/sign-in?role=ADMIN${next ? `&returnTo=${encodeURIComponent(next)}` : ''}`,
      );
    } else if (user && user.role !== 'ADMIN') router.replace('/forbidden');
  }, [user, router]);
  if (error)
    return (
      <section role="alert">
        <p>Unable to verify access. Please try again.</p>
        <button onClick={retry}>Retry</button>
      </section>
    );
  if (user === undefined) return <SessionLoader />;
  if (!user || user.role !== 'ADMIN') return null;
  return children;
}

function DestinationAccess({ children }: { children: ReactNode }) {
  const path = usePathname();
  const search = useSearchParams().toString();
  const destination = path + (search ? `?${search}` : '');
  // Other role boundaries retain their existing per-destination checks.
  return (
    <CheckAccess key={destination} path={path} destination={destination}>
      {children}
    </CheckAccess>
  );
}

export default function AccessGate({ children }: { children: ReactNode }) {
  // At the root layout this stays "admin" for every Admin tab. Do not subscribe
  // the entire workspace to dynamic page params/search params or their suspense.
  const segment = useSelectedLayoutSegment();
  return segment === 'admin' ? (
    children
  ) : (
    <DestinationAccess>{children}</DestinationAccess>
  );
}
