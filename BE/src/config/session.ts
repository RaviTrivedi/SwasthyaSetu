import "./env.js";

export function browserConfig(source: NodeJS.ProcessEnv = process.env): {
  frontendOrigin: string;
  apiOrigin: string;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
} {
  const production = source.NODE_ENV === "production";
  function origin(name: string, fallback: string): URL {
    const value = source[name] ?? (production ? "" : fallback);

    try {
      const url = new URL(value);

      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.origin !== value ||
        url.username ||
        url.password
      )
        throw new Error();
      if (production && url.protocol !== "https:") throw new Error();
      return url;
    } catch {
      throw new Error(
        `${name} must be an explicit HTTP(S) origin (HTTPS in production).`
      );
    }
  }
  const frontend = origin("FRONTEND_ORIGIN", "http://localhost:3000");
  const api = origin("API_ORIGIN", `http://localhost:${source.PORT ?? "4000"}`);
  const rawSecure =
    source.COOKIE_SECURE ?? (api.protocol === "https:" ? "true" : "false");
  if (!["true", "false"].includes(rawSecure))
    throw new Error("COOKIE_SECURE must be true or false.");
  const secure = rawSecure === "true";
  const loopback = (url: URL) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!secure && (production || !loopback(api) || !loopback(frontend))) {
    throw new Error(
      "Insecure cookies are allowed only for local development origins."
    );
  }
  if (secure && api.protocol !== "https:")
    throw new Error("Secure cookies require an HTTPS API_ORIGIN.");
  const sameSite =
    source.COOKIE_SAME_SITE ??
    (frontend.hostname === api.hostname && frontend.protocol === api.protocol
      ? "lax"
      : "none");
  if (sameSite !== "lax" && sameSite !== "strict" && sameSite !== "none") {
    throw new Error("COOKIE_SAME_SITE must be lax, strict, or none.");
  }
  if (sameSite === "none" && !secure)
    throw new Error("SameSite=None requires Secure cookies and HTTPS.");
  return {
    frontendOrigin: frontend.origin,
    apiOrigin: api.origin,
    secure,
    sameSite,
  };
}

export function sessionConfig(source: NodeJS.ProcessEnv = process.env) {
  const browser = browserConfig(source);
  const secret = source.ACCESS_TOKEN_SECRET;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error(
      "ACCESS_TOKEN_SECRET must be 32 random bytes encoded as 64 hexadecimal characters."
    );
  }
  return {
    ...browser,
    signingKey: Buffer.from(secret, "hex"),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 2592000,
  };
}
