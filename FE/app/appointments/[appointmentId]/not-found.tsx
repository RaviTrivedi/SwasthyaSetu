import Link from "next/link";

export default function NotFound() {
  return <section><h1>Appointment not found</h1><p>This request is unavailable or the link is incorrect.</p><Link href="/appointments">Back to My appointments</Link></section>;
}
