import styles from './SearchResultsState.module.css';

export type ResultsState = 'results' | 'loading' | 'empty' | 'error';

export default function SearchResultsState({
  state,
  hasFilters,
  onClear,
  onRetry,
}: {
  state: Exclude<ResultsState, 'results'>;
  hasFilters: boolean;
  onClear: () => void;
  onRetry: () => void;
}) {
  if (state === 'loading') {
    return (
      <section
        className={styles.section}
        aria-label="Care options"
        aria-busy="true"
      >
        <p role="status">Loading care options…</p>
        <div className={styles.grid} aria-hidden="true">
          {[0, 1].map((key) => (
            <div key={key} className={styles.skeleton}>
              <span className={styles.short} />
              <span />
              <span />
              <span className={styles.short} />
              <span />
              <span className={styles.short} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="results-state-title">
      <div className={styles.message}>
        <div role={state === 'error' ? 'alert' : 'status'}>
          <h2 id="results-state-title">
            {state === 'error'
              ? "We couldn't load care options"
              : 'No care options found'}
          </h2>
          <p>
            {state === 'error'
              ? 'Please try again. Your search and filter selections are still here.'
              : hasFilters
                ? 'Try clearing your filters to explore more care options.'
                : 'Try a different specialty or location using Change search above.'}
          </p>
        </div>
        {state === 'error' ? (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        ) : hasFilters ? (
          <button type="button" onClick={onClear}>
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
