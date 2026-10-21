'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import AppointmentReviewModal from '../AppointmentReviewModal';
import styles from './BookingDetailsForm.module.css';

type Field = 'patientName' | 'phone' | 'email' | 'reason';
type Values = Record<Field, string>;
const initialValues: Values = {
  patientName: '',
  phone: '',
  email: '',
  reason: '',
};

function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, '');
  // Accept a pasted/autofilled country code without duplicating the fixed prefix.
  return compact
    .replace(/^(?:\+91|0091)(?=\d{10}$)/, '')
    .replace(/^91(?=\d{10}$)/, '');
}

function phoneError(value: string) {
  if (!value) return 'Enter your mobile number.';
  return /^[6-9]\d{9}$/.test(value)
    ? undefined
    : 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9. +91 is already included.';
}

export default function BookingDetailsForm({
  review,
  requestedHref,
}: {
  review: ReactNode;
  requestedHref: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  function update(field: Field, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setMessage('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Values> = {};
    if (!values.patientName.trim())
      nextErrors.patientName = "Enter the patient's name.";
    const invalidPhone = phoneError(values.phone);
    if (invalidPhone) nextErrors.phone = invalidPhone;
    if (
      values.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
    )
      nextErrors.email =
        'Enter a valid email address or leave this field blank.';
    if (!values.reason.trim())
      nextErrors.reason = 'Briefly describe the reason for your visit.';
    setErrors(nextErrors);
    setMessage('');
    const firstError = (Object.keys(initialValues) as Field[]).find(
      (field) => nextErrors[field],
    );
    if (firstError) {
      (
        formRef.current?.elements.namedItem(firstError) as HTMLElement | null
      )?.focus();
      return;
    }
    // TODO: Integrate Firebase Phone Auth / OTP here to verify this phone number.
    // Use `+91${values.phone}` as the full phone number for future verification.
    // Do not treat client-side phone validation as phone ownership verification.
    // TODO: The Express API must revalidate the slot and create an appointment
    // request with Pending status after verification; clinic approval confirms it.
    // This preview never sends patient data, calls an API, or persists a booking.
    setMessage(
      'Your details passed the form checks. Phone verification and request submission will be available later. No appointment request has been sent or confirmed. Future requests will remain pending clinic approval.',
    );
  }

  function description(field: Field, hint?: string) {
    return (
      [hint, errors[field] ? `${field}-error` : undefined]
        .filter(Boolean)
        .join(' ') || undefined
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className={styles.form}
      aria-labelledby="patient-details-title"
    >
      <h2 id="patient-details-title">Patient details</h2>
      <p className={styles.note}>
        Required fields are marked “required”. Details stay in this page only.
      </p>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="patient-name">Patient name (required)</label>
          <input
            id="patient-name"
            name="patientName"
            autoComplete="name"
            required
            maxLength={100}
            value={values.patientName}
            onChange={(event) => update('patientName', event.target.value)}
            aria-invalid={Boolean(errors.patientName)}
            aria-describedby={description('patientName')}
          />
          {errors.patientName && (
            <p id="patientName-error" className={styles.error}>
              {errors.patientName}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="patient-phone">Mobile phone (required)</label>
          <div className={styles.phoneInput}>
            <span className={styles.countryCode} aria-hidden="true">
              +91
            </span>
            <input
              id="patient-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              maxLength={25}
              placeholder="98765 43210"
              value={values.phone}
              onChange={(event) =>
                update('phone', normalizePhone(event.target.value))
              }
              onBlur={() =>
                setErrors((previous) => ({
                  ...previous,
                  phone: phoneError(values.phone),
                }))
              }
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={description('phone', 'phone-hint')}
            />
          </div>
          <p id="phone-hint" className={styles.note}>
            India (+91). Enter your 10-digit mobile number; the country code is
            already included. No SMS will be sent in this preview.
          </p>
          {/* TODO: Add the Firebase Phone Auth / OTP verification UI here later. */}
          {errors.phone && (
            <p id="phone-error" className={styles.error}>
              {errors.phone}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="patient-email">Email (optional)</label>
          <input
            id="patient-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={description('email')}
          />
          {errors.email && (
            <p id="email-error" className={styles.error}>
              {errors.email}
            </p>
          )}
        </div>
        <div className={`${styles.field} ${styles.reason}`}>
          <label htmlFor="patient-reason">Reason for visit (required)</label>
          <textarea
            id="patient-reason"
            name="reason"
            required
            rows={4}
            maxLength={1000}
            value={values.reason}
            onChange={(event) => update('reason', event.target.value)}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={description('reason', 'reason-hint')}
          />
          <p id="reason-hint" className={styles.note}>
            In a few words, tell the care team what you would like help with,
            such as a routine checkup or follow-up. Up to 1,000 characters.
          </p>
          {errors.reason && (
            <p id="reason-error" className={styles.error}>
              {errors.reason}
            </p>
          )}
        </div>
      </div>
      <p className={styles.note}>
        This is a frontend preview. A future appointment request will need
        clinic approval.
      </p>
      <button type="submit" className={styles.submit}>
        Review patient details
      </button>
      <AppointmentReviewModal
        open={Boolean(message)}
        onClose={() => setMessage('')}
        requestedHref={requestedHref}
      >
        <p className={styles.status}>{message}</p>
        {review}
      </AppointmentReviewModal>
    </form>
  );
}
