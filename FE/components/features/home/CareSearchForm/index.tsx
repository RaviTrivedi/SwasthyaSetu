"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./CareSearchForm.module.css";

export default function CareSearchForm() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Care search is coming soon. Search results are not available yet.");
  }

  return (
    <form
      className={styles.form}
      role="search"
      aria-label="Find nearby care"
      onSubmit={handleSubmit}
      onChange={() => setMessage("")}
    >
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="care-location">Location</label>
          <input
            id="care-location"
            name="location"
            type="text"
            autoComplete="address-level2"
            placeholder="City or postcode"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="care-query">What care are you looking for?</label>
          <input
            id="care-query"
            name="care"
            type="search"
            placeholder="Specialty, doctor, clinic, or concern"
            aria-describedby="care-query-hint"
          />
        </div>
        <button className={styles.submit} type="submit">Search care</button>
      </div>
      <p id="care-query-hint" className={styles.hint}>
        Search by specialty, doctor, clinic, or health concern.
      </p>
      <p className={styles.status} role="status">{message}</p>
    </form>
  );
}
