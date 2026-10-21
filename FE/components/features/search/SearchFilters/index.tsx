'use client';

import { useState } from 'react';
import styles from './SearchFilters.module.css';

export const defaultFilters = {
  clinic: false,
  hospital: false,
  specialty: '',
  availability: '',
  distance: '',
};
export type FilterValues = typeof defaultFilters;
const specialties = [
  'General Medicine',
  'Eye Care',
  'Ear, Nose & Throat (ENT)',
  'Orthopedics',
  "Women's Health",
  'Skin & Hair',
  'Dental Care',
  'Heart & Cardiology',
];

export default function SearchFilters({
  filters,
  setFilters,
}: {
  filters: FilterValues;
  setFilters: (filters: FilterValues) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const count =
    Number(filters.clinic || filters.hospital) +
    Number(Boolean(filters.specialty)) +
    Number(Boolean(filters.availability)) +
    Number(Boolean(filters.distance));

  return (
    <section className={styles.section} aria-labelledby="search-filters-title">
      <div className={styles.heading}>
        <h2 id="search-filters-title">Filters</h2>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls="search-filter-controls"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide filters' : 'Show filters'}
          {count > 0 ? ` (${count})` : ''}
        </button>
      </div>
      <div
        id="search-filter-controls"
        className={styles.panel}
        data-expanded={expanded}
      >
        <p id="filter-preview-note" className={styles.note}>
          Preview only: selections do not change results yet.
        </p>
        <div className={styles.grid} aria-describedby="filter-preview-note">
          <fieldset className={styles.facility}>
            <legend>Facility type</legend>
            <div className={styles.checkboxes}>
              {(['clinic', 'hospital'] as const).map((type) => (
                <label key={type}>
                  <input
                    type="checkbox"
                    name="facilityType"
                    value={type}
                    checked={filters[type]}
                    onChange={(event) =>
                      setFilters({ ...filters, [type]: event.target.checked })
                    }
                  />
                  {type === 'clinic' ? 'Clinic' : 'Hospital'}
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.field}>
            <label htmlFor="filter-specialty">Specialty or service</label>
            <select
              id="filter-specialty"
              value={filters.specialty}
              onChange={(event) =>
                setFilters({ ...filters, specialty: event.target.value })
              }
            >
              <option value="">All specialties</option>
              {specialties.map((specialty) => (
                <option key={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="filter-availability">Availability</label>
            <select
              id="filter-availability"
              value={filters.availability}
              onChange={(event) =>
                setFilters({ ...filters, availability: event.target.value })
              }
            >
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">Within 7 days</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="filter-distance">Distance</label>
            <select
              id="filter-distance"
              value={filters.distance}
              aria-describedby="filter-distance-note"
              onChange={(event) =>
                setFilters({ ...filters, distance: event.target.value })
              }
            >
              <option value="">Any distance</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
            <p id="filter-distance-note" className={styles.hint}>
              From your selected location.
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor="filter-fee">Consultation fee</label>
            <select id="filter-fee" disabled aria-describedby="filter-fee-note">
              <option>Not available yet</option>
            </select>
            <p id="filter-fee-note" className={styles.hint}>
              Fee information is not available.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <p role="status" aria-atomic="true" className={styles.note}>
            {count === 0
              ? 'No filters selected'
              : `${count} filter ${count === 1 ? 'group' : 'groups'} selected`}
          </p>
          <button
            type="button"
            className={styles.clear}
            disabled={count === 0}
            onClick={() => setFilters(defaultFilters)}
          >
            Clear filters
          </button>
        </div>
      </div>
    </section>
  );
}
