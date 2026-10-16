import CareSearchForm from "../CareSearchForm";
import styles from "./HomeHero.module.css";

export default function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Care closer to you</p>
        <h1 id="home-hero-title">Find the right care,<br />close to home.</h1>
        <p className={styles.description}>
          Discover nearby hospitals, clinics, and doctors. Explore your options
          and request an appointment when you find the care you need.
        </p>
      </div>
      <CareSearchForm />
      <p className={styles.reassurance}>
        Browse freely. No sign-in needed to explore care.
      </p>
    </section>
  );
}
