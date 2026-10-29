import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { createLoginPatient } from '../src/services/patient/login.service.js';
import { createRegisterPatient } from '../src/services/patient/register.service.js';
import { createPatientAuthRouter } from '../src/routes/patient/auth.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { findUserByEmail } from '../src/repositories/user.repository.js';
import { app } from '../src/app.js';
import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify } from 'jose';
import { createIssueSession } from '../src/services/patient/session.service.js';
import { sessionConfig } from '../src/config/session.js';

const credentials = { email: '  TEST@EXAMPLE.INVALID  ', password: ' test passphrase ' };
type User = NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>;
let storedUser: User;
const setup = createRegisterPatient({
  async findUserByEmail() { return null; },
  async createUser(input) {
    storedUser = {
      ...input, id: '621f8031-73b9-4f15-b79e-5f726c9dbdd2', role: 'PATIENT',
      createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    return storedUser;
  },
});
const ready = setup({ ...credentials, firstName: 'Test' });

async function fixture(mode: 'found' | 'unknown' | 'failure' | 'session-failure' = 'found', production = false) {
  await ready;
  const lookups: string[] = [];
  const settings = sessionConfig({
    NODE_ENV: production ? 'production' : 'test',
    FRONTEND_ORIGIN: production ? 'https://web.example.test' : 'http://localhost:3000',
    API_ORIGIN: production ? 'https://api.example.test' : 'http://localhost:4000',
    ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex'),
  });
  const sessions: { userId: string; tokenHash: string; expiresAt: Date }[] = [];
  const issue = createIssueSession({ async createSession(input) {
    if (mode === 'session-failure') throw new Error('private database failure');
    sessions.push(input);
  } }, () => settings);
  const login = createLoginPatient({
    async findUserByEmail(email) {
      lookups.push(email);
      if (mode === 'failure') throw new Error('private database details');
      return mode === 'unknown' ? null : storedUser;
    },
  });
  const application = express();
  application.use('/api/v1/auth', createPatientAuthRouter(undefined, login, issue));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/login`;
  return {
    lookups, sessions, settings,
    post(body: unknown) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); },
    raw(body: string) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }); },
    async close() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}

test('login persists only a refresh hash and returns a signed access token and safe user', async () => {
  const f = await fixture();
  try {
    const response = await f.post(credentials);
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\/api\/v1\/auth/);
    assert.match(cookie, /Expires=/);
    assert.doesNotMatch(cookie, /Secure|Domain=/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const rawToken = cookie.split(';')[0]!.split('=')[1]!;
    assert.match(rawToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(f.sessions.length, 1);
    assert.deepEqual(Object.keys(f.sessions[0]!).sort(), ['expiresAt', 'tokenHash', 'userId']);
    assert.equal(f.sessions[0]!.tokenHash, createHash('sha256').update(rawToken).digest('hex'));
    assert.equal(f.sessions[0]!.userId, storedUser.id);
    assert.ok(f.sessions[0]!.expiresAt.getTime() > Date.now() + 29 * 86400000);
    const body = await response.json() as { user: unknown; accessToken: string };
    assert.deepEqual(Object.keys(body).sort(), ['accessToken', 'user']);
    assert.deepEqual(body.user, {
      id: storedUser.id, firstName: 'Test', email: 'test@example.invalid',
      role: 'PATIENT', createdAt: storedUser.createdAt.toISOString(),
    });
    const { payload } = await jwtVerify(body.accessToken, f.settings.signingKey, { algorithms: ['HS256'] });
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'role', 'sub']);
    assert.equal(payload.sub, storedUser.id);
    assert.equal(payload.role, 'PATIENT');
    assert.equal(payload.exp! - payload.iat!, 900);
    await assert.rejects(jwtVerify(body.accessToken, randomBytes(32), { algorithms: ['HS256'] }));
    assert.deepEqual(f.lookups, ['test@example.invalid']);
  } finally { await f.close(); }
});

test('wrong password and unknown email have identical public 401 responses', async () => {
  for (const mode of ['found', 'unknown'] as const) {
    const f = await fixture(mode);
    try {
      const response = await f.post({ ...credentials, password: mode === 'found' ? 'wrong' : credentials.password });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: 'Invalid email or password' });
      assert.equal(response.headers.get('set-cookie'), null);
      assert.equal(f.sessions.length, 0);
    } finally { await f.close(); }
  }
});

test('login preserves password whitespace', async () => {
  const f = await fixture();
  try {
    const response = await f.post({ ...credentials, password: credentials.password.trim() });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: 'Invalid email or password' });
  } finally { await f.close(); }
});

test('invalid input and role injection fail before repository access', async () => {
  const f = await fixture();
  try {
    for (const body of [
      {}, [], null, { ...credentials, email: undefined }, { ...credentials, email: 1 },
      { ...credentials, email: 'invalid' }, { ...credentials, email: ' ' },
      { ...credentials, email: `${'a'.repeat(255)}@example.invalid` },
      { ...credentials, password: undefined }, { ...credentials, password: 1 },
      { ...credentials, password: '' }, { ...credentials, password: 'a'.repeat(129) },
      { ...credentials, role: 'PATIENT' }, { ...credentials, role: 'ADMIN' },
      { ...credentials, passwordHash: 'injected' },
      { ...credentials, userId: storedUser.id },
    ]) {
      const response = await f.post(body);
      assert.equal(response.status, 400);
      const result = await response.json() as { message: string };
      assert.ok(['Invalid login input', 'Invalid JSON body'].includes(result.message));
      assert.deepEqual(Object.keys(result), ['message']);
    }
    assert.equal(f.lookups.length, 0);
    assert.equal(f.sessions.length, 0);
  } finally { await f.close(); }
});

test('login sanitizes database failures and malformed or oversized bodies', async () => {
  const f = await fixture('failure');
  try {
    const failure = await f.post(credentials);
    assert.equal(failure.status, 500);
    assert.deepEqual(await failure.json(), { message: 'Internal server error' });
    const malformed = await f.raw('{"password":');
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { message: 'Invalid JSON body' });
    const large = await f.post({ ...credentials, password: 'x'.repeat(17000) });
    assert.equal(large.status, 413);
    assert.deepEqual(await large.json(), { message: 'Request body too large' });
  } finally { await f.close(); }
});

test('application mounts POST login with the centralized error handler', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: 'Invalid login input' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('production cookie is Secure, HttpOnly, host-only, and cross-site compatible', async () => {
  const f = await fixture('found', true);
  try {
    const first = await f.post(credentials);
    assert.equal(first.status, 200);
    const cookie = first.headers.get('set-cookie')!;
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /SameSite=None/);
    assert.doesNotMatch(cookie, /Domain=/);
    await first.json();
    const second = await f.post(credentials);
    assert.equal(second.status, 200);
    await second.json();
    assert.notEqual(f.sessions[0]!.tokenHash, f.sessions[1]!.tokenHash);
  } finally { await f.close(); }
});

test('failed session persistence issues neither a cookie nor an access token', async () => {
  const f = await fixture('session-failure');
  try {
    const response = await f.post(credentials);
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
  } finally { await f.close(); }
});

test('session settings reject missing secrets, wildcard origins and insecure production cookies', () => {
  const secret = randomBytes(32).toString('hex');
  assert.throws(() => sessionConfig({}), /ACCESS_TOKEN_SECRET/);
  assert.throws(() => sessionConfig({ ACCESS_TOKEN_SECRET: 'short' }), /ACCESS_TOKEN_SECRET/);
  assert.throws(() => sessionConfig({ ACCESS_TOKEN_SECRET: secret, FRONTEND_ORIGIN: '*' }), /FRONTEND_ORIGIN/);
  assert.throws(() => sessionConfig({ ACCESS_TOKEN_SECRET: secret, COOKIE_SAME_SITE: 'none', COOKIE_SECURE: 'false' }), /SameSite=None/);
  const production = { NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://web.example.test', API_ORIGIN: 'https://api.example.test', ACCESS_TOKEN_SECRET: secret };
  assert.throws(() => sessionConfig({ ...production, COOKIE_SECURE: 'false' }), /Insecure cookies/);
  assert.throws(() => sessionConfig({ ...production, API_ORIGIN: 'http://localhost:4000' }), /API_ORIGIN/);
});

test('credentialed CORS allows only the configured frontend and rejects hostile origins', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/login`;
    const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
    const allowed = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
    assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
    const denied = await fetch(url, { method: 'POST', headers: { Origin: 'https://untrusted.invalid', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('set-cookie'), null);
    assert.deepEqual(await denied.json(), { message: 'Origin not allowed' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
