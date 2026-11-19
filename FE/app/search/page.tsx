import {Suspense} from 'react';
import SearchExperience from '@/components/features/search/SearchExperience';
export default function SearchPage(){return <Suspense fallback={<p role="status">Loading search...</p>}><SearchExperience/></Suspense>;}
