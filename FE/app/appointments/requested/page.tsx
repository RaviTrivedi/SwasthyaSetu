import type { Metadata } from "next";
import { Suspense } from "react";
import AppointmentRequested from "@/components/features/appointments/AppointmentRequested";

export const metadata: Metadata = { title: "Appointment request | SwasthyaSetu" };

export default function RequestedPage({ searchParams }: PageProps<"/appointments/requested">) {
  return <Suspense fallback={<p role="status">Loading request summary...</p>}>
    <AppointmentRequested searchParams={searchParams} />
  </Suspense>;
}
