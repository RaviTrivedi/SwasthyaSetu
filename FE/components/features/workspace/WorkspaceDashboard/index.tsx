import type { Facility } from '../api';
import type { WorkspaceSection } from '../WorkspaceShell';
import styles from '../WorkspaceForms.module.css';
export default function WorkspaceDashboard({ profile, onNavigate }: { profile: Facility; onNavigate: (section: WorkspaceSection) => void }) {
  return <section className={styles.panel}><h2>Facility overview</h2><p>Your approved {profile.facilityType.toLowerCase()}.</p>
    <dl className={styles.details}><dt>Facility</dt><dd>{profile.facilityName}</dd><dt>Contact person</dt><dd>{profile.contactPersonName}</dd><dt>Email</dt><dd>{profile.contactEmail}</dd><dt>Phone</dt><dd>{profile.contactPhone}</dd><dt>Address</dt><dd>{profile.address}, {profile.city}</dd><dt>Description</dt><dd>{profile.description || 'No description added.'}</dd></dl>
    <h3>Offered services</h3>{profile.services.length ? <ul className={styles.list}>{profile.services.map((name,index) => <li key={`${name}-${index}`}>{name}</li>)}</ul> : <p>No services added yet.</p>}
    <div className={styles.actions}><button onClick={() => onNavigate('Facility Profile')}>Edit profile</button><button onClick={() => onNavigate('Services')}>Manage services</button><button onClick={() => onNavigate('Availability')}>Opening hours and slots</button></div>
  </section>;
}
