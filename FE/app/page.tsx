import HomeHero from '@/components/features/home/HomeHero';
import SpecialtyCategories from '@/components/features/home/SpecialtyCategories';
import NearbyFacilities from '@/components/features/home/NearbyFacilities';
import FeaturedHospitals from '@/components/features/home/FeaturedHospitals';

// AccessGate withholds this segment until its client-side role check completes.
// Next's prerender validator cannot inspect the page behind that boundary.
export const instant = false;

export default function Home() {
  return (
    <>
      <HomeHero />
      <SpecialtyCategories />
      <NearbyFacilities />
      <FeaturedHospitals />
    </>
  );
}
