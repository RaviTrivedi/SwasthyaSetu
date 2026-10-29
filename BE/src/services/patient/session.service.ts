import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { sessionConfig } from "../../config/session.js";
import * as sessionRepository from "../../repositories/session.repository.js";
import type { LoginPatient } from "./login.service.js";

interface SessionRepository {
  createSession(
    input: Parameters<typeof sessionRepository.createSession>[0]
  ): Promise<unknown>;
}

export function createIssueSession(
  repository: SessionRepository = sessionRepository,
  config = sessionConfig
) {
  return async (user: Awaited<ReturnType<LoginPatient>>) => {
    const settings = config();
    const now = Math.floor(Date.now() / 1000);
    const refreshToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date((now + settings.refreshTtlSeconds) * 1000);
    const accessToken = await new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(user.id)
      .setIssuedAt(now)
      .setExpirationTime(now + settings.accessTtlSeconds)
      .sign(settings.signingKey);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt });
    return {
      accessToken,
      refreshToken,
      expiresAt,
      secure: settings.secure,
      sameSite: settings.sameSite,
    };
  };
}

export const issueSession = createIssueSession();
export type IssueSession = ReturnType<typeof createIssueSession>;
