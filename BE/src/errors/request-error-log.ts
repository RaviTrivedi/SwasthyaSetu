import type { Request } from 'express';

const databaseHints: Record<string, string> = {
  P1000: 'Database authentication failed. Check database credentials.',
  P1001: 'Database unreachable. Check PostgreSQL and DATABASE_URL.',
  P1002: 'Database connection timed out.',
  P2002: 'Unique constraint violation.',
  P2003: 'Related record is missing or still referenced.',
  P2021: 'Database table missing. Check applied migrations.',
  P2022: 'Database column missing. Check applied migrations and generated client.',
  P2025: 'Required record not found. For signup, check that the assigned role exists and migrations are applied.',
  P2034: 'Database transaction conflict. Retry the operation.',
};
const errorNames = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'HttpError',
  'PrismaClientKnownRequestError', 'PrismaClientUnknownRequestError', 'PrismaClientInitializationError', 'PrismaClientValidationError']);

// Allowlist diagnostics instead of logging error objects: Prisma messages can
// embed queries/credentials, and JSON parser errors can embed the request body.
export function requestErrorDetails(error: unknown, req: Request, status: number, requestId: string, message: string, development: boolean) {
  const object = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const code = typeof object.code === 'string' && (/^P\d{4}$/.test(object.code) || ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(object.code)) ? object.code : undefined;
  const frames = development && error instanceof Error
    ? [...(error.stack ?? '').matchAll(/(?:src|dist)[\\/][\w.\\/-]+\.(?:ts|[cm]?js):\d+:\d+/g)].map(match => match[0]).slice(0, 8)
    : undefined;
  return {
    timestamp: new Date().toISOString(), event: 'request_error', requestId,
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method) ? req.method : 'OTHER',
    // route.path is the server-defined template, never the submitted URL/query.
    route: typeof req.route?.path === 'string' ? req.route.path : '(before route matching)',
    status, message,
    errorType: typeof object.name === 'string' && errorNames.has(object.name) ? object.name : 'Error',
    ...(code ? { code, hint: databaseHints[code] ?? 'Check database connectivity and schema configuration.' } : {}),
    ...(frames?.length ? { sourceLocations: frames } : {}),
  };
}
