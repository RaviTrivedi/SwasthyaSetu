import { apiRequest } from '../auth/api';

export type DirectorySection = 'doctors' | 'slots' | 'users';
export type UserSummary = { id: string; firstName: string; email: string; role: string; disabledAt: string | null; createdAt: string };
export type DoctorSummary = UserSummary & { applications: { id: string; facilityName: string; status: string; facility: { id: string; facilityName: string; facilityType: string } | null }[] };
export type SlotSummary = { id: string; startsAt: string; endsAt: string; status: string; appointmentStatus: string | null; facility: { id: string; facilityName: string; timezone: string | null } };
export type DirectoryItem = DoctorSummary | UserSummary | SlotSummary;
export type DirectoryPage = { items: DirectoryItem[]; total: number; page: number; pageSize: number };
const paths = { doctors: '/admin/doctors', slots: '/admin/appointment-slots', users: '/admin/users' };
const invalid = () => new Error('Invalid directory response. Please retry.');
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid(); return value as Record<string, unknown>; }
function text(value: unknown): string { if (typeof value !== 'string') throw invalid(); return value; }
function nullable(value: unknown): string | null { return value === null ? null : text(value); }
function date(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw invalid(); return result; }
function choice(value: unknown, options: string[]): string { const result = text(value); if (!options.includes(result)) throw invalid(); return result; }
function user(value: unknown): UserSummary {
  const row = object(value);
  return { id: text(row.id), firstName: text(row.firstName), email: text(row.email), role: choice(row.role, ['PATIENT','ADMIN','DOCTOR']), disabledAt: row.disabledAt === null ? null : date(row.disabledAt), createdAt: date(row.createdAt) };
}
function item(value: unknown, section: DirectorySection): DirectoryItem {
  const row = object(value);
  if (section === 'users') return user(row);
  if (section === 'doctors') {
    if (!Array.isArray(row.applications) || row.role !== 'DOCTOR') throw invalid();
    return { ...user(row), applications: row.applications.map(value => {
      const application = object(value), facility = application.facility === null ? null : object(application.facility);
      return { id: text(application.id), facilityName: text(application.facilityName), status: choice(application.status, ['PENDING','APPROVED','REJECTED']), facility: facility && { id: text(facility.id), facilityName: text(facility.facilityName), facilityType: choice(facility.facilityType, ['CLINIC','HOSPITAL']) } };
    }) };
  }
  const facility = object(row.facility);
  return { id: text(row.id), startsAt: date(row.startsAt), endsAt: date(row.endsAt), status: choice(row.status, ['AVAILABLE','BOOKED','UNAVAILABLE']), appointmentStatus: row.appointmentStatus === null ? null : choice(row.appointmentStatus, ['PENDING','BOOKED']), facility: { id: text(facility.id), facilityName: text(facility.facilityName), timezone: nullable(facility.timezone) } };
}
export function createDirectoryApi(request = apiRequest) {
  return async (section: DirectorySection, query: string): Promise<DirectoryPage> => {
    const response = await request(`${paths[section]}?${query}`);
    if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Please sign in again.' : response.status === 403 ? 'An active Admin account is required.' : response.status === 400 ? 'Check your filters and date range, then try again.' : 'Unable to load records. Please retry.');
    const result = object(await response.json());
    if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total) || Number(result.total) < 0 || !Number.isInteger(result.page) || Number(result.page) < 1 || !Number.isInteger(result.pageSize) || Number(result.pageSize) < 1 || Number(result.pageSize) > 100) throw invalid();
    return { items: result.items.map(value => item(value, section)), total: Number(result.total), page: Number(result.page), pageSize: Number(result.pageSize) };
  };
}
export const directoryApi = createDirectoryApi();

// Form dates are explicitly UTC; the API's upper bound is exclusive.
export function directoryQuery(section: DirectorySection, form: FormData, page = 1): string {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  const filter = section === 'doctors' ? 'applicationStatus' : section === 'users' ? 'role' : 'status';
  const value = String(form.get(filter) ?? ''); if (value) query.set(filter, value);
  if (section === 'slots') {
    const facilityId = String(form.get('facilityId') ?? '').trim();
    if (facilityId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facilityId)) throw new Error('Enter a valid facility UUID.');
      query.set('facilityId', facilityId);
    }
    for (const key of ['from','to']) { const value = String(form.get(key) ?? ''); if (value) { const timestamp = Date.parse(`${value}Z`); if (!Number.isFinite(timestamp)) throw new Error('Enter valid UTC dates and times.'); query.set(key, new Date(timestamp).toISOString()); } }
    if (query.has('from') && query.has('to') && query.get('from')! >= query.get('to')!) throw new Error('The end time must be later than the start time.');
  }
  return query.toString();
}
