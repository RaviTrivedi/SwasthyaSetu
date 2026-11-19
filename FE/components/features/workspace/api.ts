import { apiRequest } from '../auth/api';
export type Facility = { id: string; facilityName: string; facilityType: 'CLINIC' | 'HOSPITAL'; contactPersonName: string; contactEmail: string; contactPhone: string; address: string; city: string; description: string | null; services: string[]; createdAt: string; updatedAt: string };
export type ProfileInput = Pick<Facility, 'facilityName' | 'facilityType' | 'contactPersonName' | 'contactEmail' | 'contactPhone' | 'address' | 'city'> & { description: string; services?: string[] };
export type Service = { id: string; name: string; createdAt: string; updatedAt: string };
export type Schedule = { timezone: string; days: { day: number; periods: { open: string; close: string }[] }[] };
export type Slots = { timezone: string; intervalMinutes: 30; slots: { id: string; startsAt: string; endsAt: string; booked: boolean }[] };
export class WorkspaceApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const invalid = () => new Error('Invalid facility response. Please retry.');
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid(); return value as Record<string, unknown>; }
function text(value: unknown): string { if (typeof value !== 'string') throw invalid(); return value; }
function date(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw invalid(); return result; }
function strings(value: unknown): string[] { if (!Array.isArray(value)) throw invalid(); return value.map(text); }
function facility(value: unknown): Facility {
  const row = object(value); if (row.facilityType !== 'CLINIC' && row.facilityType !== 'HOSPITAL') throw invalid();
  return { id: text(row.id), facilityName: text(row.facilityName), facilityType: row.facilityType, contactPersonName: text(row.contactPersonName), contactEmail: text(row.contactEmail), contactPhone: text(row.contactPhone), address: text(row.address), city: text(row.city), description: row.description === null ? null : text(row.description), services: strings(row.services), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) };
}
function service(value: unknown): Service { const row = object(value); return { id: text(row.id), name: text(row.name), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt) }; }
export function validateSchedule(value: Schedule): Schedule {
  try { if (!value.timezone || value.timezone.length > 100 || /^[+-]/.test(value.timezone)) throw invalid(); new Intl.DateTimeFormat('en', { timeZone: value.timezone }); } catch { throw new Error('Enter a valid IANA timezone, such as Asia/Kolkata.'); }
  if (value.days.length !== 7 || new Set(value.days.map(day => day.day)).size !== 7) throw new Error('Provide all seven days exactly once.');
  for (const day of value.days) {
    if (!Number.isInteger(day.day) || day.day < 0 || day.day > 6 || day.periods.length > 12) throw new Error('Each day supports up to 12 open periods.');
    const periods = [...day.periods].sort((a,b) => a.open.localeCompare(b.open));
    for (const [index, period] of periods.entries()) {
      if (![period.open, period.close].every(time => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) || period.open >= period.close) throw new Error('Use HH:mm times with opening before closing. Overnight periods are not supported.');
      if (index && periods[index - 1].close > period.open) throw new Error('Opening periods on the same day cannot overlap.');
    }
  }
  return { timezone: value.timezone, days: value.days.map(day => ({ day: day.day, periods: day.periods.map(period => ({ open: period.open, close: period.close })) })) };
}
function schedule(value: unknown): Schedule {
  const row = object(value); if (!Array.isArray(row.days)) throw invalid();
  return validateSchedule({ timezone: text(row.timezone), days: row.days.map(value => { const day = object(value); if (typeof day.day !== 'number' || !Array.isArray(day.periods)) throw invalid(); return { day: day.day, periods: day.periods.map(value => { const period = object(value); return { open: text(period.open), close: text(period.close) }; }) }; }) });
}
function slots(value: unknown): Slots {
  const row = object(value); if (row.intervalMinutes !== 30 || !Array.isArray(row.slots)) throw invalid();
  return { timezone: text(row.timezone), intervalMinutes: 30, slots: row.slots.map(value => { const slot = object(value); if (typeof slot.booked !== 'boolean') throw invalid(); return { id: text(slot.id), startsAt: date(slot.startsAt), endsAt: date(slot.endsAt), booked: slot.booked }; }) };
}
export function profilePayload(form: FormData, includeServices = true): ProfileInput {
  const read = (key: string) => String(form.get(key) ?? '').trim();
  for (const [key, max] of Object.entries({ facilityName: 200, contactPersonName: 100, address: 500, city: 100 })) if (!read(key) || read(key).length > max) throw new Error(`Check ${key}: use 1–${max} characters.`);
  const facilityType = read('facilityType'); if (facilityType !== 'CLINIC' && facilityType !== 'HOSPITAL') throw new Error('Select Clinic or Hospital.');
  const contactEmail = read('contactEmail').toLowerCase(); if (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error('Enter a valid contact email.');
  if (!/^\+[1-9]\d{7,14}$/.test(read('contactPhone'))) throw new Error('Use + followed by 8–15 digits for the phone number.');
  if (read('description').length > 2000) throw new Error('Description must be 2000 characters or fewer.');
  const services = read('services').split('\n').map(value => value.trim()).filter(Boolean);
  if (includeServices && (services.length < 1 || services.length > 50 || services.some(name => name.length > 100))) throw new Error('Enter 1–50 services, one per line, up to 100 characters each.');
  return { facilityName: read('facilityName'), facilityType, contactPersonName: read('contactPersonName'), contactEmail, contactPhone: read('contactPhone'), address: read('address'), city: read('city'), description: read('description'), ...(includeServices ? { services } : {}) };
}
export function slotQuery(from: string, to: string): string {
  for (const value of [from,to]) if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new Error('Choose valid start and end dates.');
  if (to < from || Date.parse(to) - Date.parse(from) >= 31 * 86400000) throw new Error('Choose up to 31 days, with end on or after start.');
  return new URLSearchParams({ from, to }).toString();
}
export function createWorkspaceApi(request = apiRequest) {
  const root = '/doctor/facility';
  async function read(path = '', options?: Parameters<typeof apiRequest>[1]) {
    const response = await request(root + path, options);
    if (!response.ok) {
      const messages: Record<number,string> = { 400: 'Check the fields or date range. Slots must be within today and the next 365 days in the facility timezone.', 401: 'Your session expired. Please sign in again.', 403: 'An active Doctor account is required.', 404: 'Your approved facility or the requested resource was not found.', 409: 'The facility may have changed, reached a limit, or have multiple approved applications. Reload and try again.' };
      throw new WorkspaceApiError(response.status, messages[response.status] ?? 'Unable to complete the request. Please retry.');
    }
    return response.status === 204 ? null : response.json();
  }
  const nameBody = (name: string) => { name = name.trim(); if (!name || name.length > 100) throw new Error('Service names must contain 1–100 characters.'); return { name }; };
  return {
    async profile() { return facility(await read()); },
    async updateProfile(input: ProfileInput) { return facility(await read('', { method: 'PATCH', body: input })); },
    async services() { const result = await read('/services'); if (!Array.isArray(result)) throw invalid(); return result.map(service); },
    async addService(name: string) { return service(await read('/services', { method: 'POST', body: nameBody(name) })); },
    async updateService(id: string, name: string) { return service(await read(`/services/${encodeURIComponent(id)}`, { method: 'PATCH', body: nameBody(name) })); },
    async removeService(id: string) { await read(`/services/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    async hours() { return schedule(await read('/opening-hours')); },
    async saveHours(input: Schedule) { return schedule(await read('/opening-hours', { method: 'PUT', body: validateSchedule(input) })); },
    async slots(from: string, to: string) { return slots(await read(`/slots?${slotQuery(from,to)}`)); },
  };
}
export const workspaceApi = createWorkspaceApi();
