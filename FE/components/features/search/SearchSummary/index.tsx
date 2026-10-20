import CareSearchForm from "@/components/features/home/CareSearchForm";
import styles from "./SearchSummary.module.css";

type SearchValues = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

function Summary({
  location,
  query,
  loading = false,
}: {
  location: string;
  query: string;
  loading?: boolean;
}) {
  return (
    <section className={styles.summary} aria-labelledby="search-title">
      <div className={styles.heading}>
        <div>
          <h3 className={styles.eyebrow}>Explore your care options</h3>
          {/* <h1 id="search-title">Search results</h1> */}
        </div>
      </div>
      {!loading && (
        <CareSearchForm
          key={`${location}-${query}`}
          initialLocation={location}
          initialQuery={query === "All specialties" ? "" : query}
        />
      )}
    </section>
  );
}

export default async function SearchSummary({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  const values = await searchParams;
  return (
    <Summary
      location={firstValue(values.location) || "Ahmedabad"}
      query={
        firstValue(values.query) ||
        firstValue(values.specialty) ||
        "All specialties"
      }
    />
  );
}

export function SearchSummaryFallback() {
  return (
    <div aria-busy="true">
      <Summary location="Loading location…" query="Loading search…" loading />
      <p className="visually-hidden" role="status">
        Loading your search summary.
      </p>
    </div>
  );
}
