"use client";

import { useState } from "react";
import ProviderCard from "@/components/features/providers/ProviderCard";
import { searchFacilities } from "../data/facilities";
import styles from "./SearchResultsOverview.module.css";

const pageSize = 2;
type SortOrder = "nearest" | "name";

export default function SearchResultsOverview() {
  const [message, setMessage] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nearest");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  // Sort a copy so the shared mock data stays unchanged across renders.
  const sortedFacilities = [...searchFacilities].sort((a, b) => {
    const byName =
      a.name.localeCompare(b.name, "en-IN") ||
      a.id.localeCompare(b.id, "en-IN");
    return sortOrder === "name"
      ? byName
      : a.distanceKm - b.distanceKm || byName;
  });
  const visibleFacilities = sortedFacilities.slice(0, visibleCount);
  const hasMore = visibleFacilities.length < sortedFacilities.length;

  return (
    <section className={styles.section} aria-labelledby="care-results-title">
      <div className={styles.toolbar}>
        <div>
          <h2 id="care-results-title">Care options</h2>
          <p>
            {searchFacilities.length} results{" "}
            <span className={styles.preview}>Sample listings</span>
          </p>
        </div>
        <div className={styles.sort}>
          <label htmlFor="results-sort">Sort by</label>
          <select
            id="results-sort"
            value={sortOrder}
            aria-controls="care-results-list"
            onChange={(event) => {
              setSortOrder(event.target.value as SortOrder);
              setMessage("");
            }}
          >
            <option value="nearest">Nearest</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>
      <p className={styles.note}>
        Fictional Ahmedabad facilities with sample distances and appointment
        hours. Search terms and filters do not change these preview results yet.
      </p>
      <ul id="care-results-list" className={styles.results}>
        {visibleFacilities.map((facility) => (
          <li key={facility.id}>
            <ProviderCard
              facility={facility}
            />
          </li>
        ))}
      </ul>
      <div className={styles.loadingControls}>
        <p className={styles.progress} role="status" aria-atomic="true">
          Showing {visibleFacilities.length} of {searchFacilities.length} sample
          results, sorted by{" "}
          {sortOrder === "nearest" ? "nearest distance" : "name (A–Z)"}.
        </p>
        <button
          type="button"
          className={styles.loadMore}
          aria-controls="care-results-list"
          aria-disabled={!hasMore}
          onClick={() => {
            if (!hasMore) return;
            setVisibleCount((count) =>
              Math.min(count + pageSize, searchFacilities.length)
            );
            setMessage("");
          }}
        >
          {hasMore ? "Load more" : "All results shown"}
        </button>
      </div>
      <p className={styles.status} role="status" aria-atomic="true">
        {message}
      </p>
    </section>
  );
}
