import HomeHero from "@/components/features/home/HomeHero";
import SpecialtyCategories from "@/components/features/home/SpecialtyCategories";
import NearbyFacilities from "@/components/features/home/NearbyFacilities";
import FeaturedHospitals from "@/components/features/home/FeaturedHospitals";

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
