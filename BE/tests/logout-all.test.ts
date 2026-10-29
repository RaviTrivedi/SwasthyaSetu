import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { sessionConfig } from '../src/config/session.js';
import { createAuthenticate } from '../src/middleware/authenticate.js';
import { createLogoutAllController } from '../src/controllers/patient/logout-all.controller.js';
import { createLogoutAll } from '../src/services/patient/logout-all.service.js';
import { createIssueSession } from '../src/services/patient/session.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { app } from '../src/app.js';

async function fixture(production = false, fail = false) {
  const settings = sessionConfig({ NODE_ENV: production ? 'production' : 'test',
    FRONTEND_ORIGIN: production ? 'https://web.example.test' : 'http://localhost:3000',
    API_ORIGIN: production ? 'https://api.example.test' : 'http://localhost:4000',
    ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex'),
  });
  const userId = randomUUID();
  const issued = await createIssueSession({ async createSession() {} }, () => settings)({
    id: userId, firstName: 'Test', email: 'test@example.invalid', role: 'PATIENT', createdAt: new Date(),
  });
  const calls: string[] = [];
  const logout = createLogoutAll({ async revokeActiveSessionsByUserId(id) {
    calls.push(id);
    if (fail) throw new Error('private database internals');
  } });
  const application = express();
  application.post('/logout-all', createAuthenticate(() => settings), createLogoutAllController(logout, () => settings));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { userId, issued, calls, settings,
    post(authorization?: string) {
      return fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/logout-all?userId=attacker`, {
        method: 'POST', headers: { ...(authorization ? { Authorization: authorization } : {}), 'Content-Type': 'application/json', Cookie: 'refresh_token=not-an-access-token' },
        body: JSON.stringify({ userId: 'attacker', sessionId: 'attacker', role: 'ADMIN' }),
      });
    },
    async close() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}

test('logout-all uses only verified context, clears matching cookies and returns no session details', async () => {
  for (const production of [false, true]) {
    const f = await fixture(production);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await f.post(`Bearer ${f.issued.accessToken}`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { message: 'Logged out from all devices' });
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const cookie = response.headers.get('set-cookie')!;
        assert.match(cookie, /^refresh_token=;/);
        assert.match(cookie, /Path=\/api\/v1\/auth/);
        assert.match(cookie, /HttpOnly/);
        assert.doesNotMatch(cookie, /Domain=|Max-Age=/);
        assert.ok(new Date(/Expires=([^;]+)/.exec(cookie)![1]!).getTime() < Date.now());
        if (production) { assert.match(cookie, /; Secure/); assert.match(cookie, /SameSite=None/); }
        else { assert.doesNotMatch(cookie, /; Secure/); assert.match(cookie, /SameSite=Lax/); }
      }
      assert.deepEqual(f.calls, [f.userId, f.userId]);
    } finally { await f.close(); }
  }
});

test('missing, malformed, expired, forged and invalid-claim tokens are rejected before persistence', async () => {
  const f = await fixture();
  try {
    const now = Math.floor(Date.now() / 1000);
    const valid = { sub: f.userId, role: 'PATIENT', iat: now, exp: now + 900 };
    const sign = (payload: object, key = f.settings.signingKey, alg = 'HS256') => new SignJWT({ ...payload }).setProtectedHeader({ alg, typ: 'JWT' }).sign(key);
    const tokens = [
      await sign(valid, randomBytes(32)),
      await sign({ ...valid, iat: now - 1000, exp: now - 100 }),
      await sign({ ...valid, role: 'ADMIN' }),
      await sign({ ...valid, sub: 'not-a-user-id' }),
      await sign({ sub: f.userId, role: 'PATIENT', iat: now }),
      await sign({ ...valid, iat: now + 60, exp: now + 960 }),
      await sign({ ...valid, exp: now + 3600 }),
      await sign(valid, f.settings.signingKey, 'HS384'),
    ];
    for (const header of [undefined, 'Basic credentials', 'Bearer malformed', `Bearer ${f.issued.refreshToken}`, ...tokens.map(token => `Bearer ${token}`)]) {
      const response = await f.post(header);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: 'Unauthorized' });
      assert.equal(response.headers.get('set-cookie'), null);
    }
    assert.equal(f.calls.length, 0);
  } finally { await f.close(); }
});

test('logout-all database failures are sanitized and do not report success', async () => {
  const f = await fixture(false, true);
  try {
    const response = await f.post(`Bearer ${f.issued.accessToken}`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
  } finally { await f.close(); }
});

test('application logout-all route requires authentication', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/logout-all`, { method: 'POST' });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: 'Unauthorized' });
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
