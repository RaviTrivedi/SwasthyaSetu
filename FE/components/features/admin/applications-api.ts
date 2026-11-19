import { apiRequest } from '../auth/api';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
// Mirrors the backend reviewSelect/withApplicant projection; no credential fields.
export type FacilityApplication = {
 id: string; applicantId: string; facilityName: string; facilityType: 'CLINIC' | 'HOSPITAL';
 contactPersonName: string; contactEmail: string; contactPhone: string; address: string; city: string;
 description: string | null; services: string[]; status: ApplicationStatus; createdAt: string; updatedAt: string;
 reviewedByAdminId: string | null; reviewedAt: string | null; rejectionReason: string | null;
 applicant: { id: string; firstName: string; email: string };
};
export type ApplicationPage = { items: FacilityApplication[]; total: number; page: number; pageSize: number };
export class ApplicationApiError extends Error {
 constructor(public status: number, message: string) { super(message); }
}
const statuses: string[] = ['PENDING', 'APPROVED', 'REJECTED'];
function application(value: unknown): FacilityApplication {
 if (!value || typeof value !== 'object') throw new Error('Invalid application response. Please try again.');
 const row = value as Record<string, unknown>;
 const required = ['id','applicantId','facilityName','contactPersonName','contactEmail','contactPhone','address','city','createdAt','updatedAt'];
 const applicant = row.applicant as Record<string, unknown> | null;
 if (!required.every(key => typeof row[key] === 'string') || !statuses.includes(String(row.status)) || !['CLINIC','HOSPITAL'].includes(String(row.facilityType)) || !Array.isArray(row.services) || !row.services.every(s => typeof s === 'string') || !['description','reviewedByAdminId','reviewedAt','rejectionReason'].every(key => row[key] === null || typeof row[key] === 'string') || !applicant || !['id','firstName','email'].every(key => typeof applicant[key] === 'string')) throw new Error('Invalid application response. Please try again.');
 return value as FacilityApplication;
}
export function reviewPayload(status: 'APPROVED' | 'REJECTED', reason: string) {
 if (status === 'APPROVED') return { status };
 const rejectionReason = reason.trim();
 if (!rejectionReason || rejectionReason.length > 2000) throw new Error('Enter a rejection reason of 1-2000 characters.');
 return { status, rejectionReason };
}
export function createApplicationApi(request = apiRequest) {
 const root = '/admin/facility-applications';
 async function read(response: Response) {
  if (!response.ok) {
   const messages: Record<number, string> = { 401: 'Your session expired. Please sign in again.', 403: 'An active Admin account is required.', 404: 'This application was not found.', 409: 'This application has already been reviewed. The latest details have been requested.', 400: 'Check the submitted review fields and try again.' };
   throw new ApplicationApiError(response.status, messages[response.status] ?? 'Unable to load or update applications. Please try again.');
  }
  return response.json();
 }
 return {
  async list(page = 1, status: ApplicationStatus | '' = ''): Promise<ApplicationPage> {
   const query = new URLSearchParams({ page: String(page), pageSize: '20', ...(status ? { status } : {}) });
   const result = await read(await request(`${root}?${query}`));
   if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.pageSize) || result.pageSize < 1) throw new Error('Invalid application list response. Please try again.');
   return { items: result.items.map(application), total: result.total, page: result.page, pageSize: result.pageSize };
  },
  async detail(id: string) { return application(await read(await request(`${root}/${encodeURIComponent(id)}`))); },
  async review(id: string, status: 'APPROVED' | 'REJECTED', reason = '') {
   return application(await read(await request(`${root}/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: reviewPayload(status, reason) })));
  },
 };
}
export const applicationApi = createApplicationApi();
