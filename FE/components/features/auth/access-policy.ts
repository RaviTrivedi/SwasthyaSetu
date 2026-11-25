export type PageRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export const homeFor = (role: string) => role === 'ADMIN' ? '/admin' : role === 'DOCTOR' ? '/workspace' : '/';
const within = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
export function pageRole(path: string): PageRole | 'PUBLIC' | 'AUTH' | 'FORBIDDEN' {
  if (['/sign-in', '/admin-sign-in', '/sign-up'].includes(path)) return 'AUTH';
  if (path === '/forbidden') return 'FORBIDDEN';
  if (within(path, '/admin')) return 'ADMIN';
  if (within(path, '/workspace') || path === '/doctor/application-status' || path === '/doctor/add-facility') return 'DOCTOR';
  if (within(path, '/appointments')) return 'PATIENT';
  if (path === '/' || path === '/search' || within(path, '/facilities') || within(path, '/doctors')) return 'PUBLIC';
  return 'FORBIDDEN';
}
export function allowedPage(role: string, path: string) {
  const required = pageRole(path);
  return required === role || (required === 'PUBLIC' && role === 'PATIENT');
}
// Only allow known local route families. Reject encoded paths, backslashes and dot segments
// rather than relying on browser normalization of potentially hostile redirect input.
export function safeReturnPath(value: string | null, role: string): string | null {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
  const path = value.split(/[?#]/)[0]!;
  if (path.includes('%') || path.split('/').some(segment => segment === '.' || segment === '..')) return null;
  try {
    const parsed = new URL(value, 'https://local.invalid');
    if (parsed.origin !== 'https://local.invalid' || !allowedPage(role, parsed.pathname)) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return null; }
}
