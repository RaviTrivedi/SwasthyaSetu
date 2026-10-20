import type { Metadata } from "next";
import { Suspense } from "react";
import SearchSummary, { SearchSummaryFallback } from "@/components/features/search/SearchSummary";
import SearchExperience from "@/components/features/search/SearchExperience";

export const metadata: Metadata = {
  title: "Search care | SwasthyaSetu",
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <Suspense fallback={<SearchSummaryFallback />}>
        <SearchSummary searchParams={searchParams} />
      </Suspense>
      <SearchExperience />
    </>
  );
}
