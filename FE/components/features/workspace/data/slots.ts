import { affiliationDirectory } from './affiliations';
import { workspaceRequests, type WorkspaceRequest } from './workspace';
export type ManagedSlot = {
  id: string;
  date: string;
  start: string;
  end: string;
  doctorId: string;
};
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function overlaps(a: ManagedSlot, b: ManagedSlot) {
  return (
    a.date === b.date &&
    (!a.doctorId || !b.doctorId || a.doctorId === b.doctorId) &&
    minutes(a.start) < minutes(b.end) &&
    minutes(b.start) < minutes(a.end)
  );
}
function requestSlot(request: WorkspaceRequest): ManagedSlot {
  const start = request.startsAt.slice(11, 16);
  const end = minutes(start) + request.durationMinutes;
  return {
    id: request.id,
    date: request.startsAt.slice(0, 10),
    start,
    end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    doctorId:
      affiliationDirectory.find((doctor) => doctor.name === request.doctor)
        ?.id ?? '',
  };
}
export function slotBookings(slot: ManagedSlot, requests: WorkspaceRequest[]) {
  return requests.filter(
    (request) =>
      request.status !== 'Rejected' && overlaps(slot, requestSlot(request)),
  );
}
// Seed from the shared request records, deduplicating the conflicting fixture.
export const initialManagedSlots: ManagedSlot[] = [
  ...new Map(
    workspaceRequests
      .filter((request) => request.status !== 'Rejected')
      .map((request) => {
        const slot = requestSlot(request);
        return [`${slot.date}-${slot.start}-${slot.doctorId}`, slot] as const;
      }),
  ).values(),
  {
    id: 'free-1',
    date: '2026-10-23',
    start: '14:00',
    end: '14:30',
    doctorId: 'meera-vyas',
  },
];
