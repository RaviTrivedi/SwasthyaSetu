import { createHash, randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { sessionConfig } from '../../config/session.js';
import { HttpError } from '../../errors/http-error.js';
import * as refreshRepository from '../../repositories/refresh.repository.js';

interface RefreshRepository {
  rotateSession(input: Parameters<typeof refreshRepository.rotateSession>[0]): ReturnType<typeof refreshRepository.rotateSession>;
}

export function createRefreshSession(
  repository: RefreshRepository = refreshRepository,
  config = sessionConfig,
  recordReplay = (sessionId: string) => console.warn(JSON.stringify({ event: 'refresh_token_reuse', sessionId })),
) {
  return async (presentedToken: string | undefined) => {
    if (!presentedToken || !/^[A-Za-z0-9_-]{43}$/.test(presentedToken)) {
      throw new HttpError(401, 'Invalid refresh token');
    }
    const settings = config();
    const refreshToken = randomBytes(32).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((now + settings.refreshTtlSeconds) * 1000);
    const result = await repository.rotateSession({
      tokenHash: createHash('sha256').update(presentedToken).digest('hex'),
      nextTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt,
    });
    if (result.status !== 'rotated') {
      if (result.status === 'replay') recordReplay(result.sessionId);
      throw new HttpError(401, 'Invalid refresh token');
    }
    const accessToken = await new SignJWT({ role: result.user.role })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(result.user.id).setIssuedAt(now).setExpirationTime(now + settings.accessTtlSeconds)
      .sign(settings.signingKey);
    return { accessToken, refreshToken, expiresAt, secure: settings.secure, sameSite: settings.sameSite };
  };
}

export const refreshSession = createRefreshSession();
export type RefreshSession = ReturnType<typeof createRefreshSession>;
