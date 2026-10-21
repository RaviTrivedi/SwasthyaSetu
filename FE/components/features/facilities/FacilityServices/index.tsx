import styles from './FacilityServices.module.css';

export default function FacilityServices({
  specialties,
}: {
  specialties: readonly string[];
}) {
  return (
    <section aria-labelledby="facility-services-title">
      <h2 id="facility-services-title">Services and specialties</h2>
      <ul className={styles.services}>
        {specialties.map((specialty) => (
          <li key={specialty}>{specialty}</li>
        ))}
      </ul>
    </section>
  );
}
