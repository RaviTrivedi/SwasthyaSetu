"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import styles from "./CareSearchForm.module.css";

export default function CareSearchForm({ initialLocation = "", initialQuery = "" }: { initialLocation?: string; initialQuery?: string }) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const location = String(data.get("location") ?? "").trim();
    const query = String(data.get("query") ?? "").trim();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    // Omitting a blank query uses the search page's All specialties default.
    if (query) params.set("query", query);
    const search = params.toString();
    router.push(search ? `/search?${search}` : "/search");
  }

  return (
    <form
      className={styles.form}
      role="search"
      aria-label="Find nearby care"
      action="/search"
      method="get"
      onSubmit={handleSubmit}
    >
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="care-location">Location</label>
          <input
            id="care-location"
            name="location"
            defaultValue={initialLocation}
            type="text"
            autoComplete="address-level2"
            placeholder="City or postcode"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="care-query">What care are you looking for?</label>
          <input
            id="care-query"
            name="query"
            defaultValue={initialQuery}
            type="search"
            placeholder="Specialty, doctor, clinic, or concern"
            aria-describedby="care-query-hint"
          />
        </div>
        <button className={styles.submit} type="submit">Search care</button>
      </div>
      <p id="care-query-hint" className={styles.hint}>
        Search by specialty, doctor, clinic, or health concern. Leave blank to explore all specialties.
      </p>
    </form>
  );
}
