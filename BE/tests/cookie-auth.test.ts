import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import { browserAccess } from '../src/middleware/browser-access.js';
import { createAuthenticate } from '../src/middleware/authenticate.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { sessionConfig, browserConfig } from '../src/config/session.js';
import { accessCookieOptions } from '../src/config/access-cookie.js';
import { createLogoutController } from '../src/controllers/patient/logout.controller.js';
import { createLogoutAllController } from '../src/controllers/patient/logout-all.controller.js';

test('cookies authenticate, CSRF rejects unsafe requests, CORS supports PATCH and both cookies clear', async () => {
  const settings = { ...sessionConfig({ ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex') }), ...browserConfig() };
  const userId = randomUUID();
  const token = await new SignJWT({ role: 'PATIENT' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(userId).setIssuedAt().setExpirationTime('15m').sign(settings.signingKey);
  const expired = await new SignJWT({ role: 'PATIENT' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(userId).setIssuedAt(Math.floor(Date.now()/1000)-1000).setExpirationTime(Math.floor(Date.now()/1000)-100).sign(settings.signingKey);
  const application = express(); application.use(browserAccess);
  const authenticate = createAuthenticate(() => settings);
  application.get('/protected', authenticate, (_req, res) => { res.json({ ok: true }); });
  application.patch('/protected', authenticate, (_req, res) => { res.json({ ok: true }); });
  let revoked: string | undefined;
  application.post('/logout', createLogoutController(async value => { revoked = value; }, () => settings));
  application.post('/logout-all', authenticate, createLogoutAllController(async id => { assert.equal(id, userId); }, () => settings));
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const cookie of [`access_token=${token}`, `access_token=${token}; refresh_token=unused`]) {
      assert.equal((await fetch(`${url}/protected`, { headers: { Cookie: cookie } })).status, 200);
    }
    for (const cookie of [`access_token=${expired}`, `access_token=${token}; access_token=${token}`, 'refresh_token=not-access']) {
      assert.equal((await fetch(`${url}/protected`, { headers: { Cookie: cookie } })).status, 401);
    }
    assert.equal((await fetch(`${url}/protected`, { headers: { Cookie: `access_token=${token}`, Authorization: 'Bearer invalid' } })).status, 401);
    assert.equal((await fetch(`${url}/protected`, { headers: { Authorization: `Bearer ${token}` } })).status, 200);
    for (const origin of [undefined, settings.frontendOrigin, 'null', 'https://hostile.invalid']) {
      const response = await fetch(`${url}/protected`, { method: 'PATCH', headers: { Cookie: `access_token=${token}`, ...(origin ? { Origin: origin } : {}) } });
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { message: "Request blocked by CSRF protection. Send the X-CSRF-Protection header with the value 1 for this request." });
    }
    assert.equal((await fetch(`${url}/protected`, { method: 'PATCH', headers: { Cookie: `access_token=${token}`, 'X-CSRF-Protection': '1', Origin: 'https://hostile.invalid' } })).status, 403);
    const preflight = await fetch(`${url}/protected`, { method: 'OPTIONS', headers: { Origin: settings.frontendOrigin, 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'X-CSRF-Protection' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), settings.frontendOrigin);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflight.headers.get('access-control-allow-methods')!, /PATCH/);
    assert.match(preflight.headers.get('access-control-allow-headers')!, /X-CSRF-Protection/);
    assert.equal((await fetch(`${url}/protected`, { method: 'PATCH', headers: { Cookie: `access_token=${token}`, 'X-CSRF-Protection': '1', Origin: settings.frontendOrigin } })).status, 200);
    for (const path of ['/logout', '/logout-all']) {
      const response = await fetch(`${url}${path}`, { method: 'POST', headers: { Cookie: `access_token=${token}; refresh_token=refresh-value`, 'X-CSRF-Protection': '1' } });
      assert.equal(response.status, 200);
      const cookies = response.headers.getSetCookie(); assert.equal(cookies.length, 2);
      for (const [name, path] of [['access_token', '/api/v1'], ['refresh_token', '/api/v1/auth']]) {
        const cookie = cookies.find(value => value.startsWith(`${name}=`))!;
        assert.ok(cookie); assert.ok(cookie.includes(`Path=${path};`)); assert.match(cookie, /HttpOnly/);
        assert.ok(new Date(/Expires=([^;]+)/.exec(cookie)![1]!).getTime() < Date.now());
      }
    }
    assert.equal(revoked, 'refresh-value');
    assert.deepEqual(accessCookieOptions({ secure: true, sameSite: 'none' }), { httpOnly: true, secure: true, sameSite: 'none', path: '/api/v1' });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});


test('local browser preflight permits PUT and DELETE with credentials and CSRF headers', async () => {
 const application = express(); application.use(browserAccess); application.use(errorHandler);
 const server = application.listen(0, '127.0.0.1'); await once(server, 'listening');
 try {
  for (const method of ['PUT', 'DELETE']) {
   const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/doctor/facility`, { method: 'OPTIONS', headers: { Origin: browserConfig().frontendOrigin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'content-type,x-csrf-protection' } });
   assert.equal(response.status, 204); assert.equal(response.headers.get('access-control-allow-origin'), browserConfig().frontendOrigin);
   assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
   assert.ok(response.headers.get('access-control-allow-methods')?.split(',').includes(method));
  }
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
