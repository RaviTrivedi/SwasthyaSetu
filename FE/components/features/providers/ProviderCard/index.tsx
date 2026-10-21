import styles from './ProviderCard.module.css';

export type Facility = {
  id: string;
  name: string;
  type: 'Clinic' | 'Hospital';
  address: string;
  distanceKm: number;
  services: readonly string[];
  appointmentInfo?: string;
};

type ProviderCardProps = {
  facility: Facility;
  actionLabel?: string;
};

export default function ProviderCard({
  facility,
  actionLabel = 'View details',
}: ProviderCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.topline}>
        <span className={styles.type}>{facility.type}</span>
        <span className={styles.distance}>
          {facility.distanceKm.toFixed(1)} km away
        </span>
      </div>
      <h3 className={styles.name}>{facility.name}</h3>
      <p className={styles.address}>{facility.address}</p>
      <div className={styles.services}>
        <p className={styles.label}>Specialties &amp; services</p>
        <ul>
          {facility.services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
      </div>
      {facility.appointmentInfo && (
        <p className={styles.appointments}>
          <span className={styles.label}>Appointments</span>
          {facility.appointmentInfo}
        </p>
      )}
      <Link
        href={`/facilities/${encodeURIComponent(facility.id)}`}
        className={styles.details}
        aria-label={`${actionLabel} for ${facility.name}`}
      >
        {actionLabel} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
import Link from 'next/link';
