import Image from "next/image";
import heroCare from "@/public/hero-care.png";
import CareSearchForm from "../CareSearchForm";
import styles from "./HomeHero.module.css";

export default function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.overview}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Care closer to you</p>
          <h1 id="home-hero-title">Find the right care,<br />close to home.</h1>
          <p className={styles.description}>
            Discover nearby hospitals, clinics, and doctors. Explore your options
            and request an appointment when you find the care you need.
          </p>
        </div>
        <div className={styles.visual}>
          <Image
            src={heroCare}
            alt="A doctor listening to a patient in a bright consultation room"
            className={styles.image}
            sizes="(max-width: 800px) 90vw, (max-width: 1200px) 42vw, 480px"
            preload
          />
        </div>
      </div>
      <CareSearchForm />
    </section>
  );
}
