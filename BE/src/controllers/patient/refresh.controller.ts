import type { RequestHandler } from "express";
import {
  refreshCookieName,
  refreshCookieOptions,
} from "../../config/refresh-cookie.js";
import type { RefreshSession } from "../../services/patient/refresh.service.js";

export function createRefreshController(
  refresh: RefreshSession
): RequestHandler {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    // Read only the named cookie. Reject ambiguous duplicates and malformed values.
    // Tokens issued by us are unescaped base64url, so no decoding is necessary.
    const matches = (req.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.slice(0, part.indexOf("=")) === refreshCookieName);
    const token =
      matches.length === 1
        ? matches[0]!.slice(refreshCookieName.length + 1)
        : undefined;
    const session = await refresh(token);
    res.cookie(
      refreshCookieName,
      session.refreshToken,
      refreshCookieOptions(session)
    );
    res.status(200).json({ accessToken: session.accessToken });
  };
}
