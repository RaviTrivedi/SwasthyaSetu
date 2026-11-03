export type AuthUser = { id: string; firstName: string; email: string; role: string; createdAt: string };
const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';
let refreshing: Promise<boolean> | undefined;

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
  const send = () => fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? 'GET', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  let response = await send();
  if (response.status === 401 && options.refresh !== false && await refreshSession()) response = await send();
  return response;
}

export async function currentUser(): Promise<AuthUser | null> {
  const response = await apiRequest('/auth/me');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Unable to load your profile.');
  return (await response.json()).user;
}

export async function logout(): Promise<void> {
  const response = await apiRequest('/auth/logout', { method: 'POST', refresh: false });
  if (!response.ok) throw new Error('Unable to sign out. Please try again.');
}
