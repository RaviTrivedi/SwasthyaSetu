import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { verify } from '@node-rs/argon2';
import { createRegisterPatient } from '../src/services/patient/register.service.js';
import { createPatientAuthRouter } from '../src/routes/patient/auth.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import type { createUser } from '../src/repositories/user.repository.js';
import { app } from '../src/app.js';

const valid = { firstName: '  Test  ', email: '  TEST@EXAMPLE.INVALID  ', password: ' test passphrase ' };
const record = {
  id: '621f8031-73b9-4f15-b79e-5f726c9dbdd2',
  firstName: 'Test', email: 'test@example.invalid', role: 'PATIENT' as const,
  passwordHash: 'internal-test-hash', createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

async function fixture(options: { duplicate?: boolean; race?: boolean; failure?: boolean } = {}) {
  const writes: Parameters<typeof createUser>[0][] = [];
  const lookups: string[] = [];
  const service = createRegisterPatient({
    async findUserByEmail(email) {
      lookups.push(email);
      if (options.failure) throw new Error('private database internals');
      return options.duplicate ? record : null;
    },
    async createUser(input) {
      writes.push(input);
      if (options.race) throw Object.assign(new Error('private constraint details'), { code: 'P2002' });
      return { ...record, ...input };
    },
  });
  const app = express();
  app.use('/api/v1/auth', createPatientAuthRouter(service));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/register`;
  return {
    writes, lookups,
    post(body: unknown) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); },
    raw(body: string) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }); },
    async close() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}

test('registration normalizes input, hashes with Argon2id, and returns only safe fields', async () => {
  const f = await fixture();
  try {
    const response = await f.post(valid);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(await response.json(), {
      id: record.id, firstName: 'Test', email: 'test@example.invalid',
      role: 'PATIENT', createdAt: record.createdAt.toISOString(),
    });
    assert.deepEqual(f.lookups, ['test@example.invalid']);
    assert.equal(f.writes.length, 1);
    const written = f.writes[0]!;
    assert.deepEqual(Object.keys(written).sort(), ['email', 'firstName', 'passwordHash']);
    assert.equal(written.firstName, 'Test');
    assert.equal(written.email, 'test@example.invalid');
    assert.match(written.passwordHash, /^\$argon2id\$/);
    assert.equal(await verify(written.passwordHash, valid.password), true);
  } finally { await f.close(); }
});

test('invalid fields, role injection, and unexpected fields are rejected before repository access', async () => {
  const f = await fixture();
  try {
    for (const body of [
      null, [], {}, { ...valid, firstName: undefined }, { ...valid, firstName: 3 },
      { ...valid, firstName: '   ' }, { ...valid, firstName: 'a'.repeat(101) },
      { ...valid, email: undefined }, { ...valid, email: 3 }, { ...valid, email: 'invalid' },
      { ...valid, email: `${'a'.repeat(250)}@example.invalid` },
      { ...valid, password: undefined }, { ...valid, password: 3 },
      { ...valid, password: 'a'.repeat(7) }, { ...valid, password: 'a'.repeat(129) },
      { ...valid, role: 'ADMIN' }, { ...valid, role: 'PATIENT' }, { ...valid, passwordHash: 'injected' },
    ]) {
      const response = await f.post(body);
      assert.equal(response.status, 400);
      const result = await response.json() as { message: string };
      assert.ok(['Invalid registration input', 'Invalid JSON body'].includes(result.message));
      assert.deepEqual(Object.keys(result), ['message']);
    }
    assert.equal(f.lookups.length, 0);
    assert.equal(f.writes.length, 0);
  } finally { await f.close(); }
});

test('documented password length boundaries are accepted', async () => {
  const f = await fixture();
  try {
    for (const length of [8, 128]) {
      const response = await f.post({ ...valid, password: 'x'.repeat(length), firstName: 'n'.repeat(100) });
      assert.equal(response.status, 201);
      await response.json();
    }
  } finally { await f.close(); }
});

test('existing email and concurrent duplicate writes return the same safe 409', async () => {
  for (const options of [{ duplicate: true }, { race: true }]) {
    const f = await fixture(options);
    try {
      const response = await f.post(valid);
      assert.equal(response.status, 409);
      assert.deepEqual(await response.json(), { message: 'Email is already registered' });
      assert.equal(response.headers.get('set-cookie'), null);
      if ('duplicate' in options) assert.equal(f.writes.length, 0);
    } finally { await f.close(); }
  }
});

test('unexpected errors do not expose internals', async () => {
  const f = await fixture({ failure: true });
  try {
    const response = await f.post(valid);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Internal server error' });
  } finally { await f.close(); }
});

test('malformed JSON and oversized requests return safe errors', async () => {
  const f = await fixture();
  try {
    const malformed = await f.raw('{"password":');
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { message: 'Invalid JSON body' });
    const large = await f.post({ ...valid, password: 'x'.repeat(17000) });
    assert.equal(large.status, 413);
    assert.deepEqual(await large.json(), { message: 'Request body too large' });
    assert.equal(f.lookups.length, 0);
  } finally { await f.close(); }
});

test('application mounts registration and preserves health and 404 behavior', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${base}/api/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: 'Invalid registration input' });
    const health = await fetch(`${base}/api/v1/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const missing = await fetch(`${base}/api/v1/auth/login`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: 'Not found' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
