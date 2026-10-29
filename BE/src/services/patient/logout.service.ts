import { createHash } from "node:crypto";
import * as sessionRepository from "../../repositories/session.repository.js";

interface SessionRepository {
  revokeActiveSessionByTokenHash(tokenHash: string): Promise<unknown>;
}

export function createLogoutSession(
  repository: SessionRepository = sessionRepository
) {
  return async (token: string | undefined): Promise<void> => {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await repository.revokeActiveSessionByTokenHash(tokenHash);
  };
}

export const logoutSession = createLogoutSession();
export type LogoutSession = ReturnType<typeof createLogoutSession>;
