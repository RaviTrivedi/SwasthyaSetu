import type { CookieOptions } from 'express';

export const refreshCookieName = 'refresh_token';

export function refreshCookieOptions(session: {
  secure: boolean; sameSite: 'lax' | 'strict' | 'none'; expiresAt?: Date;
}): CookieOptions {
  return {
    httpOnly: true, secure: session.secure, sameSite: session.sameSite,
    path: '/api/v1/auth', ...(session.expiresAt ? { expires: session.expiresAt } : {}),
  };
}

export function readRefreshCookie(header: string | undefined): string | undefined {
  const matches = (header ?? '').split(';').map(part => part.trim())
    .filter(part => part.slice(0, part.indexOf('=')) === refreshCookieName);
  return matches.length === 1 ? matches[0]!.slice(refreshCookieName.length + 1) : undefined;
}
