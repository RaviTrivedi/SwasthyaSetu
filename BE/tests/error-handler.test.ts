import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Request } from 'express';
import { errorHandler } from '../src/middleware/error-handler.js';
import { HttpError } from '../src/errors/http-error.js';
import { requestErrorDetails } from '../src/errors/request-error-log.js';

test('errors log safe diagnostics and correlate responses without exposing submitted secrets', async t => {
 const errors: string[] = [], warnings: string[] = [];
 t.mock.method(console, 'error', (value: string) => errors.push(value));
 t.mock.method(console, 'warn', (value: string) => warnings.push(value));
 const app = express(); app.use(express.json({ limit: '1kb' }));
 app.post('/failure/:id', () => { throw Object.assign(new Error('password=private-value token=secret-value'), { code: 'P2025', meta: { passwordHash: 'private-hash' } }); });
 app.post('/invalid', () => { throw new HttpError(400, 'Provide firstName (1-100 characters), a valid email, and password (8-128 characters). Extra fields such as role are not accepted.'); });
 app.use(errorHandler);
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 const post = (path: string, body: string) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'refresh_token=secret-cookie', Authorization: 'Bearer secret-access' }, body });
 try {
  const response = await post('/failure/private-id?token=secret-query', '{"password":"private-body"}');
  assert.equal(response.status, 500); assert.deepEqual(await response.json(), { message: 'The server could not complete this request. Try again later; use the X-Request-ID response header when reporting the problem.' });
  const entry = JSON.parse(errors[0]!);
  assert.equal(entry.requestId, response.headers.get('x-request-id')); assert.match(entry.requestId, /^[a-f0-9-]{36}$/);
  assert.equal(entry.route, '/failure/:id'); assert.equal(entry.code, 'P2025'); assert.ok(entry.hint.includes('role'));
  assert.equal((await post('/invalid', '{}')).status, 400);
  assert.equal((await post('/invalid', '{"password":"secret-malformed"')).status, 400);
  assert.equal((await post('/invalid', JSON.stringify({ password: 'secret-large'.repeat(200) }))).status, 413);
  assert.equal(warnings.length, 3);
  const output = [...errors, ...warnings].join('');
  for (const value of ['private-value', 'secret-value', 'private-hash', 'private-id', 'secret-query', 'private-body', 'secret-cookie', 'secret-access', 'secret-malformed', 'secret-large']) assert.equal(output.includes(value), false);
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('development includes source locations while production excludes stack and arbitrary metadata', () => {
 const error = Object.assign(new Error('sensitive message'), { code: 'sensitive-code', meta: { secret: 'sensitive-meta' } });
 error.stack = 'Error: sensitive message\n    at handler (C:/project/src/services/clinic/auth.service.ts:10:2)';
 const req = { method: 'POST', route: { path: '/login' } } as Request;
 const development = requestErrorDetails(error, req, 500, 'id', 'The server could not complete this request. Try again later; use the X-Request-ID response header when reporting the problem.', true);
 assert.deepEqual(development.sourceLocations, ['src/services/clinic/auth.service.ts:10:2']);
 const production = requestErrorDetails(error, req, 500, 'id', 'The server could not complete this request. Try again later; use the X-Request-ID response header when reporting the problem.', false);
 assert.equal('sourceLocations' in production, false);
 assert.equal('code' in production, false);
 assert.equal(JSON.stringify(production).includes('sensitive'), false);
});

