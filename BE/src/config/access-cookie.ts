import type { CookieOptions } from 'express';
export const accessCookieName = 'access_token';
export function accessCookieOptions(settings: { secure: boolean; sameSite: 'lax' | 'strict' | 'none' }): CookieOptions {
  return { httpOnly: true, secure: settings.secure, sameSite: settings.sameSite, path: '/api/v1' };
}
export function readAccessCookie(header: string | undefined): string | undefined {
  const values = (header ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${accessCookieName}=`));
  return values.length === 1 ? values[0]!.slice(accessCookieName.length + 1) : undefined;
}
