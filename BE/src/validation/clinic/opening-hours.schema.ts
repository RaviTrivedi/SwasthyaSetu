import { z } from 'zod';
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const period = z.strictObject({ open: time, close: time }).refine(p => p.open < p.close);
const day = z.strictObject({ day: z.number().int().min(0).max(6), periods: z.array(period).max(12) }).refine(d => {
  const sorted = [...d.periods].sort((a, b) => a.open.localeCompare(b.open));
  return sorted.every((p, i) => i === 0 || sorted[i - 1]!.close <= p.open);
});
export const openingHoursSchema = z.strictObject({
  timezone: z.string().min(1).max(100).refine(value => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return !/^[+-]/.test(value); } catch { return false; }
  }),
  days: z.array(day).length(7).refine(days => new Set(days.map(d => d.day)).size === 7),
});
export type OpeningHours = z.infer<typeof openingHoursSchema>;
const date = z.iso.date().refine(value => value >= '2000-01-01' && value <= '9998-12-31');
export const slotQuerySchema = z.union([
  z.strictObject({ date }).transform(q => ({ from: q.date, to: q.date })),
  z.strictObject({ from: date, to: date }).refine(q => q.to >= q.from && Date.parse(q.to) - Date.parse(q.from) < 31 * 86400000),
]);
export type SlotRange = z.infer<typeof slotQuerySchema>;
