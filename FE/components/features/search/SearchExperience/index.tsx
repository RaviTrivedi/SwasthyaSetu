'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { bookingApi } from '../../appointments/api';
import ProviderCard from '../../providers/ProviderCard';
import styles from './SearchExperience.module.css';
import summary from '../SearchSummary/SearchSummary.module.css';
import filters from '../SearchFilters/SearchFilters.module.css';
import results from '../SearchResultsOverview/SearchResultsOverview.module.css';
import searchForm from '../../home/CareSearchForm/CareSearchForm.module.css';

function Results({
  query,
  onPage,
}: {
  query: string;
  onPage: (page: number) => void;
}) {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof bookingApi.list>
  > | null>(null);
  const [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    bookingApi
      .list(query)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError('Unable to load facilities. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [query, attempt]);
  if (error)
    return (
      <section role="alert">
        <p>{error}</p>
        <button
          className={results.loadMore}
          onClick={() => {
            setError('');
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </button>
      </section>
    );
  if (!data) return <p role="status">Loading clinics and hospitals...</p>;
  return (
    <section className={results.section} aria-labelledby="care-results-title">
      <div className={results.toolbar}>
        <div>
          <h2 id="care-results-title">Care options</h2>
          <p role="status">{data.total} results</p>
        </div>
        {/* <p className={results.note}>Sorted by name (A–Z)</p> */}
      </div>
      <ul id="care-results-list" className={results.results}>
        {data.items.map((item) => (
          <li key={item.id}>
            <ProviderCard
              facility={{
                id: item.id,
                name: item.facilityName,
                type: item.facilityType === 'CLINIC' ? 'Clinic' : 'Hospital',
                address: `${item.address}, ${item.city}`,
                services: item.services,
              }}
            />
          </li>
        ))}
      </ul>
      {!data.items.length && (
        <p className={results.note}>
          No facilities match these filters. Try a different city or facility
          name.
        </p>
      )}
      <nav
        className={results.loadingControls}
        aria-label="Facility result pages"
      >
        <p className={results.progress}>
          Page {data.page} of{' '}
          {Math.max(1, Math.ceil(data.total / data.pageSize))}
        </p>
        <div className={styles.pagination}>
          <button
            className={results.loadMore}
            disabled={data.page <= 1}
            aria-disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
          >
            Previous
          </button>
          <button
            className={results.loadMore}
            disabled={
              data.page >= 100000 || data.page * data.pageSize >= data.total
            }
            aria-disabled={
              data.page >= 100000 || data.page * data.pageSize >= data.total
            }
            onClick={() => onPage(data.page + 1)}
          >
            Next
          </button>
        </div>
      </nav>
    </section>
  );
}

function SearchContent({ initial }: { initial: string }) {
  const params = new URLSearchParams(initial);
  const [name, setName] = useState((params.get('query') ?? '').slice(0, 100));
  const [city, setCity] = useState(
    (params.get('city') ?? params.get('location') ?? '').slice(0, 100),
  );
  const [type, setType] = useState(
    ['CLINIC', 'HOSPITAL'].includes(params.get('facilityType') ?? '')
      ? params.get('facilityType')!
      : '',
  );
  const [expanded, setExpanded] = useState(false);
  function makeQuery(
    facilityName: string,
    location: string,
    facilityType: string,
  ) {
    const query = new URLSearchParams({ page: '1', pageSize: '20' });
    if (facilityName.trim()) query.set('query', facilityName.trim());
    if (location.trim()) query.set('city', location.trim());
    if (facilityType) query.set('facilityType', facilityType);
    return query.toString();
  }
  const [query, setQuery] = useState(() => makeQuery(name, city, type));
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(makeQuery(name, city, type));
  }
  function changeType(value: string) {
    setType(value);
    // Keep the submitted search while changing the sidebar filter.
    const next = new URLSearchParams(query);
    next.set('page', '1');
    if (value) next.set('facilityType', value);
    else next.delete('facilityType');
    setQuery(next.toString());
  }
  return (
    <>
      <section className={summary.summary} aria-labelledby="search-title">
        <div className={summary.heading}>
          <div>
            <p className={summary.eyebrow}>Explore your care options</p>
            <h1 id="search-title">Search results</h1>
          </div>
        </div>
        <form onSubmit={search} className={searchForm.form}>
          <div className={searchForm.fields}>
            <div className={searchForm.field}>
              <label htmlFor="search-city">City</label>
              <input
                id="search-city"
                name="city"
                maxLength={100}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Enter a city"
              />
            </div>
            <div className={searchForm.field}>
              <label htmlFor="search-name">Facility name</label>
              <input
                id="search-name"
                name="query"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Search clinics or hospitals"
              />
            </div>
            <button className={searchForm.submit}>Search</button>
          </div>
        </form>
      </section>
      <div className={styles.layout}>
        <aside
          className={filters.section}
          aria-labelledby="search-filters-title"
        >
          <div className={filters.heading}>
            <h2 id="search-filters-title">Filters</h2>
            <button
              className={filters.toggle}
              aria-expanded={expanded}
              aria-controls="search-filter-controls"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide filters' : 'Show filters'}
            </button>
          </div>
          <div
            id="search-filter-controls"
            className={filters.panel}
            data-expanded={expanded}
          >
            <div className={filters.grid}>
              <div className={filters.field}>
                <label htmlFor="facility-type">Facility type</label>
                <select
                  id="facility-type"
                  value={type}
                  onChange={(event) => changeType(event.target.value)}
                >
                  <option value="">All facilities</option>
                  <option value="CLINIC">Clinics</option>
                  <option value="HOSPITAL">Hospitals</option>
                </select>
              </div>
            </div>
            <div className={filters.actions}>
              <button
                className={filters.clear}
                onClick={() => {
                  setName('');
                  setCity('');
                  setType('');
                  setQuery(makeQuery('', '', ''));
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
        </aside>
        <div className={styles.content}>
          <Results
            key={query}
            query={query}
            onPage={(page) => {
              const next = new URLSearchParams(query);
              next.set('page', String(page));
              setQuery(next.toString());
            }}
          />
        </div>
      </div>
    </>
  );
}
export default function SearchExperience() {
  const initial = useSearchParams().toString();
  return <SearchContent key={initial} initial={initial} />;
}
