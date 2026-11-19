'use client';
import { useState } from 'react';
import { workspaceApi } from '../api';
import { useResource } from '../use-resource';
import FacilityProfileEditor from '../FacilityProfileEditor';
import WorkspaceDashboard from '../WorkspaceDashboard';
import ServiceManagement from '../ServiceManagement';
import SlotManagement from '../SlotManagement';
import styles from './WorkspaceShell.module.css';
const sections = ['Dashboard', 'Appointment Requests', 'Doctors', 'Availability', 'Services', 'Facility Profile'] as const;
export type WorkspaceSection = (typeof sections)[number];
export default function WorkspaceShell() {
  const profile = useResource(workspaceApi.profile);
  const [section, setSection] = useState<WorkspaceSection>('Dashboard');
  return <>
    <header className={styles.header}><p>Doctor facility workspace</p><h1>{profile.data?.facilityName ?? 'Your facility'}</h1>
      {profile.data && <p>{profile.data.facilityType} · {profile.data.address}, {profile.data.city}</p>}
    </header>
    <div className={styles.layout}>
      <nav className={styles.navigation} aria-label="Facility workspace">{sections.map(item => <button key={item} type="button" aria-current={section === item ? 'page' : undefined} onClick={() => setSection(item)}>{item}</button>)}</nav>
      <div className={styles.content}>
        {profile.loading ? <p role="status">Loading your approved facility...</p> : profile.error ? <section role="alert"><p>{profile.error.message}</p><button onClick={profile.retry}>Retry</button></section> : profile.data && (
          section === 'Dashboard' ? <WorkspaceDashboard profile={profile.data} onNavigate={setSection} /> :
          section === 'Facility Profile' ? <FacilityProfileEditor profile={profile.data} onSave={profile.setData} /> :
          section === 'Services' ? <ServiceManagement onChange={services => profile.setData({ ...profile.data!, services })} /> :
          section === 'Availability' ? <SlotManagement /> :
          <section className={styles.placeholder}><h2>{section}</h2><p>These tools are not connected yet. No live records are available in this section.</p></section>
        )}
      </div>
    </div>
  </>;
}
