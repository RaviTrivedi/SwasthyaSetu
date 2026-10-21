import Link from 'next/link';
import { getFacility } from '@/components/features/facilities/data/facilities';
import { getFacilityDoctors } from '@/components/features/facilities/data/doctors';
import DoctorSelection from '../DoctorSelection';
import styles from './AppointmentDoctorStep.module.css';
import AppointmentTimeSelection from '../AppointmentTimeSelection';
import AppointmentReview from '../AppointmentReview';
import BookingDetailsForm from '../BookingDetailsForm';
import AppointmentSteps from '../AppointmentSteps';
import { getAppointmentSlots } from '../data/slots';

export default async function AppointmentDoctorStep({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const facilityId =
    typeof params.facilityId === 'string' ? params.facilityId.trim() : '';
  const facility = getFacility(facilityId);

  if (!facility) {
    return (
      <section className={styles.header}>
        <h1>Choose a clinic or hospital first</h1>
        <p>
          Select a facility before choosing a doctor for your appointment. The
          facility in this link is missing or unavailable.
        </p>
        <Link href="/search" className={styles.link}>
          Find a clinic or hospital
        </Link>
      </section>
    );
  }

  const doctors = getFacilityDoctors(facility.id);
  const doctorOption =
    typeof params.doctorOption === 'string' ? params.doctorOption : '';
  const step = typeof params.step === 'string' ? params.step : 'doctor';
  const validDoctor =
    doctorOption === 'any' ||
    doctors.some((doctor) => doctor.id === doctorOption);
  const chooseHref = `/appointments/new?${new URLSearchParams({
    facilityId: facility.id,
  })}`;
  if ((step !== 'doctor' || doctorOption) && !validDoctor) {
    return (
      <section className={styles.header}>
        <h1>Choose a doctor preference first</h1>
        <p>
          The doctor selection is missing or does not belong to {facility.name}.
        </p>
        <Link className={styles.link} href={chooseHref}>
          Choose again
        </Link>
      </section>
    );
  }
  const slots = getAppointmentSlots(facility.id, doctorOption);
  const selected = slots.find((slot) => slot.id === params.slotId);
  if (step === 'details') {
    if (
      !selected ||
      params.doctorId !== selected.doctorId ||
      params.date !== selected.date ||
      params.time !== selected.time ||
      params.timeZone !== 'Asia/Kolkata'
    ) {
      return (
        <section className={styles.header}>
          <h1>Choose an available appointment again</h1>
          <p>
            This selection is missing, unavailable, or does not match the
            selected clinic and doctor.
          </p>
          <Link className={styles.link} href={chooseHref}>
            Choose again
          </Link>
        </section>
      );
    }
    return (
      <>
        <AppointmentSteps current={3} />
        <header className={styles.header}>
          <p className={styles.eyebrow}>Step 3 of 3</p>
          <h1>Patient details</h1>
          <p>
            One more step: enter the patient details below. Your appointment
            request has not been submitted.
          </p>
        </header>
        <Link
          className={styles.link}
          href={`/appointments/new?${new URLSearchParams({
            facilityId: facility.id,
            doctorOption,
            slotId: selected.id,
            doctorId: selected.doctorId,
            date: selected.date,
            time: selected.time,
            timeZone: 'Asia/Kolkata',
            step: 'time',
          })}`}
        >
          Edit date and time
        </Link>
        <BookingDetailsForm
          requestedHref={`/appointments/requested?${new URLSearchParams({
            facilityId: facility.id,
            doctorOption,
            slotId: selected.id,
            preview: 'request-sent',
          })}`}
          key={`${facility.id}-${doctorOption}-${selected.id}`}
          review={
            <AppointmentReview
              facility={facility}
              doctorOption={doctorOption}
              slot={selected}
            />
          }
        />
      </>
    );
  }
  return (
    <>
      <AppointmentSteps current={step === 'time' ? 2 : 1} />
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          Appointment request ·{' '}
          {step === 'time' ? 'Step 2 of 3' : 'Step 1 of 3'}
        </p>
        <h1>
          {step === 'time' ? 'Choose a date and time' : 'Choose a doctor'}
        </h1>
        <h2>{facility.name}</h2>
        <p>
          {facility.type} · {facility.address}
        </p>
        <Link href="/search" className={styles.link}>
          Choose a different facility
        </Link>
      </header>
      {step === 'time' ? (
        <>
          <p className={styles.preference}>
            Doctor preference:{' '}
            {doctorOption === 'any'
              ? 'Any available doctor'
              : doctors.find((doctor) => doctor.id === doctorOption)?.name}
          </p>
          <AppointmentTimeSelection
            key={`${facility.id}-${doctorOption}`}
            facility={facility}
            doctorOption={doctorOption}
            slots={slots}
            initialSlotId={
              typeof params.slotId === 'string' ? params.slotId : undefined
            }
          />
        </>
      ) : (
        <DoctorSelection
          key={`${facility.id}-${doctorOption}`}
          facilityId={facility.id}
          doctors={doctors}
          initialDoctorOption={doctorOption}
        />
      )}
    </>
  );
}
