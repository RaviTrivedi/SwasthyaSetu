'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { bookingApi, type PublicFacility } from '../../appointments/api';
import ProviderCard from '../../providers/ProviderCard';
import nearby from '../NearbyFacilities/NearbyFacilities.module.css';
import hospitals from '../FeaturedHospitals/FeaturedHospitals.module.css';

export default function MarketplaceFacilities() {
  const [facilities, setFacilities] = useState<PublicFacility[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all(
      ['CLINIC', 'HOSPITAL'].map((type) =>
        bookingApi.list(`facilityType=${type}&pageSize=6`),
      ),
    )
      .then((results) => {
        if (active) setFacilities(results.flatMap((result) => result.items));
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (error)
    return (
      <section role="alert">
        <p>Unable to load facilities.</p>
        <button
          onClick={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </button>
      </section>
    );
  if (!facilities) return <p role="status">Loading clinics and hospitals...</p>;
  const visible = facilities;
  const clinics = facilities.filter(
    (facility) => facility.facilityType === 'CLINIC',
  );
  const card = (facility: PublicFacility) => (
    <ProviderCard
      facility={{
        id: facility.id,
        name: facility.facilityName,
        type: facility.facilityType === 'CLINIC' ? 'Clinic' : 'Hospital',
        address: `${facility.address}, ${facility.city}`,
        services: facility.services,
      }}
    />
  );
  return (
    <>
      <section
        className={nearby.section}
        aria-labelledby="nearby-facilities-title"
      >
        <div className={nearby.heading}>
          <div>
            <p className={nearby.location}>Find your care</p>
            <h2 id="nearby-facilities-title">Clinics</h2>
          </div>
          <Link className={nearby.viewAll} href="/search?facilityType=CLINIC">
            View all &rarr;
          </Link>
        </div>
        <ul className={nearby.grid}>
          {clinics.map((facility) => (
            <li key={facility.id}>{card(facility)}</li>
          ))}
        </ul>
        {!clinics.length && (
          <p className={nearby.status}>No clinics are listed yet.</p>
        )}
      </section>
      <section
        className={hospitals.section}
        aria-labelledby="featured-hospitals-title"
      >
        <div className={hospitals.heading}>
          <div>
            <p className={hospitals.eyebrow}>Hospital care</p>
            <h2 id="featured-hospitals-title">Hospitals to explore</h2>
          </div>
          <Link className={hospitals.viewAll} href="/search">
            View all facilities &rarr;
          </Link>
        </div>
        <p className={hospitals.description}>
          Explore hospitals offering care across a range of specialties.
        </p>
        <ul className={hospitals.grid}>
          {visible
            .filter((facility) => facility.facilityType === 'HOSPITAL')
            .map((facility) => (
              <li key={facility.id}>{card(facility)}</li>
            ))}
        </ul>
        {!visible.some((facility) => facility.facilityType === 'HOSPITAL') && (
          <p>No hospitals are listed for this selection.</p>
        )}
      </section>
      <section className={nearby.section}>
        <h2>Run a clinic or hospital?</h2>
        <p>Submit your facility for Admin review.</p>
        <Link className={nearby.viewAll} href="/doctor/add-facility">
          Add clinic/hospital
        </Link>{' '}
        <Link className={nearby.viewAll} href="/sign-up?role=DOCTOR">
          Create a Doctor account
        </Link>
      </section>
    </>
  );
}
