"use client";

import Link from "next/link";

export default function Error({ reset }: { reset: () => void }) {
  return <section><div role="alert"><h1>We couldn’t load this appointment</h1><p>Please try again, or return to your appointments.</p></div><button type="button" onClick={reset}>Try again</button><p><Link href="/appointments">Back to My appointments</Link></p></section>;
}
