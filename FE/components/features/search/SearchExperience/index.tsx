'use client';

import { useEffect, useRef, useState } from 'react';
import SearchFilters, { defaultFilters } from '../SearchFilters';
import SearchResultsOverview from '../SearchResultsOverview';
import SearchResultsState, { type ResultsState } from '../SearchResultsState';
import styles from './SearchExperience.module.css';

export default function SearchExperience() {
  const [filters, setFilters] = useState(defaultFilters);
  const [state, setState] = useState<ResultsState>('results');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRegion = useRef<HTMLDivElement>(null);
  const hasFilters = Object.values(filters).some(Boolean);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function restoreResults() {
    setState('loading');
    if (timer.current) clearTimeout(timer.current);
    // Simulate a local retry without network requests.
    timer.current = setTimeout(() => {
      setState('results');
      timer.current = null;
      resultsRegion.current?.focus();
    }, 600);
  }

  return (
    <div className={styles.layout}>
      <aside aria-label="Filter care results">
        <SearchFilters filters={filters} setFilters={setFilters} />
      </aside>
      <div className={styles.content}>
        {process.env.NODE_ENV === 'development' && (
          <div className={styles.preview}>
            <label htmlFor="search-state-preview">Development preview</label>
            <select
              id="search-state-preview"
              value={state}
              onChange={(event) => {
                if (timer.current) clearTimeout(timer.current);
                setState(event.target.value as ResultsState);
              }}
            >
              <option value="results">Results</option>
              <option value="loading">Loading</option>
              <option value="empty">Empty</option>
              <option value="error">Error</option>
            </select>
          </div>
        )}
        <div
          ref={resultsRegion}
          tabIndex={-1}
          role="region"
          aria-label="Care results"
        >
          {state !== 'results' && (
            <SearchResultsState
              state={state}
              hasFilters={hasFilters}
              onRetry={restoreResults}
              onClear={() => {
                setFilters(defaultFilters);
                restoreResults();
              }}
            />
          )}
          <div hidden={state !== 'results'}>
            <SearchResultsOverview />
          </div>
        </div>
      </div>
    </div>
  );
}
