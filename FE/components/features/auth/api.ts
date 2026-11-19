export type AuthUser = { id: string; firstName: string; email: string; role: string; createdAt: string };
const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';
let refreshing: Promise<boolean> | undefined;
// One in-memory profile per browser application. No tokens are stored here.
let profile: AuthUser | null | undefined;
let profileRequest: Promise<AuthUser | null> | undefined;
let profileVersion = 0;
const sessionListeners = new Set<() => void>();
export const sessionSnapshot = () => profile;
export function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}
function setProfile(user: AuthUser | null) {
  profileVersion++;
  profileRequest = undefined;
  profile = user;
  sessionListeners.forEach(listener => listener());
}

async function refreshSession(): Promise<boolean> {
  const refresh = async () => {
    // Another tab may already have refreshed while we waited for the lock.
    const current = await fetch(`${origin}/api/v1/auth/me`, { credentials: 'include', cache: 'no-store' });
    if (current.ok) return true;
    const response = await fetch(`${origin}/api/v1/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: { 'X-CSRF-Protection': '1' },
    });
    return response.ok;
  };
  if (!refreshing) {
    refreshing = (async () => {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return await navigator.locks.request('swasthyasetu-session-refresh', refresh);
      }
      return await refresh();
    })().finally(() => { refreshing = undefined; });
  }
  return refreshing;
}

// JSON requests are replayable. Only retry a 401 once, never network failures or
// other statuses; protected backend routes authenticate before any mutation.
export async function apiRequest(path: string, options: { method?: string; body?: unknown; refresh?: boolean } = {}) {
  const version = profileVersion;
  const send = () => fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? 'GET', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  let response = await send();
  if (response.status === 401 && options.refresh !== false && await refreshSession()) response = await send();
  if (response.status === 401 && options.refresh !== false && version === profileVersion) setProfile(null);
  return response;
}

export function currentUser(): Promise<AuthUser | null> {
  if (profile !== undefined) return Promise.resolve(profile);
  if (profileRequest) return profileRequest;
  const version = profileVersion;
  const request = (async () => {
    const response = await apiRequest('/auth/me');
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('Unable to load your profile.');
    const user = (await response.json()).user as AuthUser;
    // An older request must not restore a session after logout or a newer login.
    if (version === profileVersion) setProfile(user);
    return profile ?? null;
  })();
  profileRequest = request;
  void request.finally(() => { if (profileRequest === request) profileRequest = undefined; }).catch(() => {});
  return request;
}

export async function logout(): Promise<void> {
  const response = await apiRequest('/auth/logout', { method: 'POST', refresh: false });
  if (!response.ok) throw new Error('Unable to sign out. Please try again.');
  setProfile(null);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-session-changed'));
}

export type StaffLoginRole = 'PATIENT' | 'ADMIN' | 'DOCTOR';
export const staffLoginOptions = {
  PATIENT: { label: 'Patient Login', endpoint: '/auth/login', dashboard: '/' },
  ADMIN: { label: 'Admin Login', endpoint: '/admin/auth/login', dashboard: '/admin' },
  DOCTOR: { label: 'Doctor Login', endpoint: '/clinic/auth/login', dashboard: '/workspace' },
} as const;
export async function staffLogin(role: StaffLoginRole, email: string, password: string) {
  const response = await apiRequest(staffLoginOptions[role].endpoint, {
    method: 'POST', refresh: false, body: { email: email.trim().toLowerCase(), password },
  });
  const invalid = 'Invalid email or password for the selected login option.';
  if (response.status === 401 || response.status === 403) throw new Error(invalid);
  if (!response.ok) throw new Error('Unable to sign in. Please try again.');
  const result = await response.json();
  if (!result.user || result.user.role !== role) throw new Error(invalid);
  setProfile(result.user as AuthUser);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-session-changed'));
  return { user: result.user as AuthUser, dashboard: staffLoginOptions[role].dashboard };
}

export type DoctorAccess = { approvedCount: number; profileAvailable: boolean; applications: { id: string; facilityName: string; status: 'PENDING' | 'REJECTED' | 'APPROVED' }[] };
export async function doctorAccess(): Promise<DoctorAccess> {
  const response = await apiRequest('/doctor/facility/application-status');
  if (!response.ok) throw new Error('Unable to check your facility application. Please try again.');
  return response.json();
}

