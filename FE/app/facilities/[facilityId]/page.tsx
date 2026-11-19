import {Suspense} from 'react';
import FacilityOverview from '@/components/features/facilities/FacilityOverview';
export default function FacilityPage({params}:PageProps<'/facilities/[facilityId]'>){return <Suspense fallback={<p role="status">Loading facility...</p>}><Details params={params}/></Suspense>;}
async function Details({params}:{params:Promise<{facilityId:string}>}){const {facilityId}=await params;return <FacilityOverview key={facilityId} facilityId={facilityId}/>;}
