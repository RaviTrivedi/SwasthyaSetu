import HomeHero from '@/components/features/home/HomeHero';
import MarketplaceFacilities from '@/components/features/home/MarketplaceFacilities';

// AccessGate withholds this segment until its client-side role check completes.
// Next's prerender validator cannot inspect the page behind that boundary.
export const instant = false;

export default function Home() {
  return (
    <>
      <HomeHero />
      <MarketplaceFacilities />
    </>
  );
}
