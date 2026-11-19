import type { RequestHandler } from "express";
import { getAuthentication } from "./authenticate.js";
import { findUserProfileById } from "../repositories/user.repository.js";
import { Role } from "../constants/roles.js";
import { HttpError } from "../errors/http-error.js";
import { API_ERROR_MESSAGES } from "../constants/messages.js";

type FindUser = (
  id: string
) => Promise<Awaited<ReturnType<typeof findUserProfileById>>>;
export function createRequireAdmin(
  findUser: FindUser = findUserProfileById
): RequestHandler {
  return async (_req, res, next) => {
    const { userId, role } = getAuthentication(res);
    if (role !== Role.ADMIN)
      throw new HttpError(403, API_ERROR_MESSAGES.ADMIN_REQUIRED);
    // Re-check current privileges so a demoted or disabled admin cannot use an old JWT.
    const user = await findUser(userId);
    if (!user || user.disabledAt || user.role !== Role.ADMIN) {
      throw new HttpError(403, API_ERROR_MESSAGES.ADMIN_REQUIRED);
    }
    next();
  };
}

export const requireAdmin = createRequireAdmin();
