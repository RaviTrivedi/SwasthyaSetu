import type { OpeningHours, SlotRange } from '../validation/clinic/opening-hours.schema.js';
import { minutes } from '../validation/clinic/opening-hours.schema.js';
const MINUTE = 60000;
const DAY = 86400000;
export function localFormatter(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
export function localParts(formatter: Intl.DateTimeFormat, instant: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}
export function generateSlots(schedule: OpeningHours, range: SlotRange, now: Date) {
  const formatter = localFormatter(schedule.timezone);
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  for (let date = Date.parse(range.from); date <= Date.parse(range.to); date += DAY) {
    const label = new Date(date).toISOString().slice(0, 10);
    const periods = schedule.days.find(d => d.day === new Date(date).getUTCDay())!.periods;
    if (!periods.length) continue;
    // Map wall-clock minutes to UTC instants. Missing/duplicated minutes identify DST gaps/folds.
    const instants = new Map<number, number[]>();
    for (let utc = date - DAY; utc < date + 2 * DAY; utc += MINUTE) {
      const local = localParts(formatter, new Date(utc));
      if (local.date === label) instants.set(local.minute, [...(instants.get(local.minute) ?? []), utc]);
    }
    for (const period of periods) for (let start = minutes(period.open); start + 30 <= minutes(period.close); start += 30) {
      const candidates = instants.get(start);
      if (candidates?.length !== 1 || candidates[0]! < now.getTime()) continue;
      const utc = candidates[0]!;
      // Every minute including the end must be unique and continuous: no transition-crossing slots.
      if (!Array.from({ length: 31 }, (_, i) => i).every(i => instants.get(start + i)?.length === 1 && instants.get(start + i)![0] === utc + i * MINUTE)) continue;
      slots.push({ startsAt: new Date(utc), endsAt: new Date(utc + 30 * MINUTE) });
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

