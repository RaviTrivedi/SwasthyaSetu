import Link from "next/link";
import { cacheLife } from "next/cache";
import styles from "./Footer.module.css";

type FooterItem = { label: string; href?: string };

const groups: { title: string; items: FooterItem[] }[] = [
  {
    title: "Explore",
    items: [
      { label: "Find care", href: "/#home-hero-title" },
      { label: "Specialties", href: "/#specialty-categories-title" },
      { label: "Hospitals", href: "/#featured-hospitals-title" },
    ],
  },
  {
    title: "For clinics",
    items: [{ label: "List your clinic" }, { label: "Clinic resources" }],
  },
  {
    title: "Support",
    items: [{ label: "Help centre" }, { label: "Contact us" }],
  },
];

export default async function Footer() {
  "use cache";

  // Keep the year prerenderable and refresh it through the server cache.
  cacheLife("hours");

  const year = new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.content}>
          <div className={styles.about}>
            <Link href="/" className={styles.brand} aria-label="SwasthyaSetu home">
              Swasthya<span>Setu</span>
            </Link>
            <p>Discover hospitals, clinics, and doctors close to home. Explore care at your own pace, without signing in.</p>
          </div>
          {groups.map(({ title, items }) => (
            <nav key={title} aria-label={`Footer ${title}`} className={styles.group}>
              <h2>{title}</h2>
              <ul>
                {items.map(({ label, href }) => (
                  <li key={label}>
                    {href ? (
                      <Link href={href} className={styles.link}>{label}</Link>
                    ) : (
                      <span role="link" aria-disabled="true" className={styles.placeholder}>
                        {label}
                        <span className={styles.comingSoon}>Coming soon</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={styles.bottom}>
          <small>© {year} SwasthyaSetu. All rights reserved.</small>
          <span>Care closer to you.</span>
        </div>
      </div>
    </footer>
  );
}
