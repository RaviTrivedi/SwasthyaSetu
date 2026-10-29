import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { jwtVerify } from 'jose';
import { sessionConfig } from '../src/config/session.js';
import { createRefreshSession } from '../src/services/patient/refresh.service.js';
import { createPatientAuthRouter } from '../src/routes/patient/auth.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
async function fixture(mode: 'active' | 'expired' | 'revoked' | 'failure' = 'active', production = false) {
  const token = randomBytes(32).toString('base64url');
  const config = sessionConfig({ NODE_ENV: production ? 'production' : 'test',
    FRONTEND_ORIGIN: production ? 'https://web.example.test' : 'http://localhost:3000',
    API_ORIGIN: production ? 'https://api.example.test' : 'http://localhost:4000',
    ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex'),
  });
  let current = digest(token);
  let revoked = mode === 'revoked';
  const consumed: string[] = [];
  const events: string[] = [];
  const writes: { tokenHash: string; nextTokenHash: string; expiresAt: Date }[] = [];
  const refresh = createRefreshSession({ async rotateSession(input) {
    if (mode === 'failure') throw new Error('private database details');
    if (input.tokenHash !== current && !consumed.includes(input.tokenHash)) return { status: 'invalid' };
    if (revoked || consumed.includes(input.tokenHash)) {
      revoked = true;
      return { status: 'replay', sessionId: 'test-session' };
    }
    if (mode === 'expired') return { status: 'invalid' };
    writes.push(input);
    consumed.push(current);
    current = input.nextTokenHash;
    return { status: 'rotated', user: { id: 'test-user', firstName: 'Test', email: 'test@example.invalid', role: 'PATIENT', createdAt: new Date() } };
  } }, () => config, id => events.push(id));
  const app = express();
  app.use('/api/v1/auth', createPatientAuthRouter(undefined, undefined, undefined, refresh));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/refresh`;
  return { token, config, writes, events,
    post(cookie?: string, body?: object) {
      return fetch(url, { method: 'POST', headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    },
    async close() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}

test('refresh returns a minimal signed access token and rotates only the cookie credential', async () => {
  for (const production of [false, true]) {
    const f = await fixture('active', production);
    try {
      const response = await f.post(`refresh_token=${f.token}`, { userId: 'attacker', role: 'ADMIN' });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.json() as { accessToken: string };
      assert.deepEqual(Object.keys(body), ['accessToken']);
      const { payload } = await jwtVerify(body.accessToken, f.config.signingKey, { algorithms: ['HS256'] });
      assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'role', 'sub']);
      assert.equal(payload.sub, 'test-user');
      assert.equal(payload.role, 'PATIENT');
      assert.equal(payload.exp! - payload.iat!, 900);
      const cookie = response.headers.get('set-cookie')!;
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /Path=\/api\/v1\/auth/);
      assert.match(cookie, /Expires=/);
      assert.doesNotMatch(cookie, /Domain=/);
      if (production) { assert.match(cookie, /; Secure/); assert.match(cookie, /SameSite=None/); }
      else { assert.doesNotMatch(cookie, /; Secure/); assert.match(cookie, /SameSite=Lax/); }
      const nextToken = cookie.split(';')[0]!.split('=')[1]!;
      assert.notEqual(nextToken, f.token);
      assert.match(nextToken, /^[A-Za-z0-9_-]{43}$/);
      assert.equal(f.writes[0]!.tokenHash, digest(f.token));
      assert.equal(f.writes[0]!.nextTokenHash, digest(nextToken));
      assert.ok(f.writes[0]!.expiresAt.getTime() > Date.now() + 29 * 86400000);
      const replay = await f.post(`refresh_token=${f.token}`);
      assert.equal(replay.status, 401);
      assert.deepEqual(await replay.json(), { message: 'Invalid refresh token' });
      assert.deepEqual(f.events, ['test-session']);
      const family = await f.post(`refresh_token=${nextToken}`);
      assert.equal(family.status, 401);
      await family.json();
    } finally { await f.close(); }
  }
});

test('missing, malformed, unknown, expired, revoked and duplicate cookies return generic 401', async () => {
  for (const mode of ['active', 'expired', 'revoked'] as const) {
    const f = await fixture(mode);
    try {
      const cookies = mode === 'active'
        ? [undefined, 'refresh_token=bad', `refresh_token=${randomBytes(32).toString('base64url')}`, `refresh_token=${f.token}; refresh_token=${f.token}`]
        : [`refresh_token=${f.token}`];
      for (const cookie of cookies) {
        const response = await f.post(cookie, { refreshToken: f.token });
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { message: 'Invalid refresh token' });
        assert.equal(response.headers.get('set-cookie'), null);
      }
      assert.equal(f.writes.length, 0);
    } finally { await f.close(); }
  }
});

test('failed rotation never returns tokens or cookies', async () => {
  const f = await fixture('failure');
  try {
    const response = await f.post(`refresh_token=${f.token}`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
    assert.equal(response.headers.get('set-cookie'), null);
  } finally { await f.close(); }
});
