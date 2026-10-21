'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './AppointmentSteps.module.css';

const steps = ['Choose doctor', 'Date and time', 'Patient details'];

export default function AppointmentSteps({ current }: { current: 1 | 2 | 3 }) {
  const params = useSearchParams();
  const destinations = ['doctor', 'time', 'details'];
  return (
    <nav aria-label="Appointment steps">
      <ol className={styles.steps} aria-label="Appointment request progress">
        {steps.map((label, index) => {
          const enabled =
            index === 0 ||
            (index === 1
              ? Boolean(params.get('doctorOption'))
              : Boolean(params.get('slotId')));
          const query = new URLSearchParams(params.toString());
          query.set('step', destinations[index]);
          const content = (
            <>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <span>
                Step {index + 1}: {label}
                <small>
                  {current === index + 1
                    ? 'Current step'
                    : enabled
                      ? 'Go to step'
                      : index === 1
                        ? 'Choose a doctor first'
                        : 'Choose a date and time first'}
                </small>
              </span>
            </>
          );
          return (
            <li
              key={label}
              aria-current={current === index + 1 ? 'step' : undefined}
            >
              {enabled ? (
                <Link
                  className={styles.control}
                  aria-current={current === index + 1 ? 'step' : undefined}
                  href={`/appointments/new?${query}`}
                >
                  {content}
                </Link>
              ) : (
                <span className={styles.control} aria-disabled="true">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
