import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { browserConfig } from '../src/config/session.js';
import { refreshCookieOptions } from '../src/config/refresh-cookie.js';
import { createLogoutController } from '../src/controllers/patient/logout.controller.js';
import { createLogoutSession } from '../src/services/patient/logout.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { app } from '../src/app.js';

async function fixture(production = false, fail = false) {
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  const calls: string[] = [];
  let revoked = false;
  const logout = createLogoutSession({ async revokeActiveSessionByTokenHash(value) {
    calls.push(value);
    if (fail) throw new Error('private database details');
    if (value === hash) revoked = true;
  } });
  const config = browserConfig(production ? {
    NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://web.example.test', API_ORIGIN: 'https://api.example.test',
  } : { NODE_ENV: 'test' });
  const application = express();
  application.post('/logout', createLogoutController(logout, () => config));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { token, hash, calls, config, revoked: () => revoked,
    post(cookie?: string, body?: object) {
      return fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/logout`, {
        method: 'POST', headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    },
    async close() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}

function cleared(response: Response, secure: boolean) {
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /^refresh_token=;/);
  assert.match(cookie, /Path=\/api\/v1\/auth/);
  assert.match(cookie, /HttpOnly/);
  assert.doesNotMatch(cookie, /Domain=|Max-Age=/);
  const expiry = /Expires=([^;]+)/.exec(cookie)![1]!;
  assert.ok(new Date(expiry).getTime() < Date.now());
  if (secure) { assert.match(cookie, /; Secure/); assert.match(cookie, /SameSite=None/); }
  else { assert.doesNotMatch(cookie, /; Secure/); assert.match(cookie, /SameSite=Lax/); }
}

test('logout hashes only the cookie, revokes its session, clears matching cookie options, and is idempotent', async () => {
  for (const production of [false, true]) {
    const f = await fixture(production);
    try {
      for (let i = 0; i < 2; i++) {
        const response = await f.post(`refresh_token=${f.token}`, { userId: 'ignored', sessionId: 'ignored' });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { message: 'Logged out' });
        assert.equal(response.headers.get('cache-control'), 'no-store');
        cleared(response, production);
      }
      assert.equal(f.revoked(), true);
      assert.deepEqual(f.calls, [f.hash, f.hash]);
      const { expires: _expires, ...setOptions } = refreshCookieOptions({ ...f.config, expiresAt: new Date() });
      assert.deepEqual(refreshCookieOptions(f.config), setOptions);
    } finally { await f.close(); }
  }
});

test('missing, invalid, unknown and ambiguous cookies still clear the cookie and succeed', async () => {
  const f = await fixture();
  try {
    for (const cookie of [undefined, 'refresh_token=bad', 'other=value', `refresh_token=${f.token}; refresh_token=${f.token}`, `refresh_token=${randomBytes(32).toString('base64url')}`]) {
      const response = await f.post(cookie, { refreshToken: f.token, sessionId: 'ignored' });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { message: 'Logged out' });
      cleared(response, false);
    }
    assert.equal(f.revoked(), false);
    assert.equal(f.calls.length, 1);
  } finally { await f.close(); }
});

test('database failures clear the cookie but return only a sanitized error', async () => {
  const f = await fixture(false, true);
  try {
    const response = await f.post(`refresh_token=${f.token}`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
    cleared(response, false);
  } finally { await f.close(); }
});

test('POST logout is mounted in the application', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/logout`, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'Logged out' });
    assert.match(response.headers.get('set-cookie')!, /^refresh_token=;/);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
