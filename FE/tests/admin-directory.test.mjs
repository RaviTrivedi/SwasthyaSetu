import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const encode = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`;
async function client() {
  const auth = encode(await readFile(new URL('../components/features/auth/api.ts', import.meta.url), 'utf8'));
  const source = (await readFile(new URL('../components/features/admin/directory-api.ts', import.meta.url), 'utf8')).replace("'../auth/api'", JSON.stringify(auth));
  return import(encode(source));
}
const user = { id: 'user', firstName: 'Owner', email: 'owner@example.invalid', role: 'DOCTOR', disabledAt: null, createdAt: '2026-11-16T00:00:00Z' };
const doctor = { ...user, applications: [{ id: 'application', facilityName: 'Clinic', status: 'APPROVED', facility: null }] };
const slot = { id: 'slot', startsAt: '2030-01-01T00:00:00Z', endsAt: '2030-01-01T00:30:00Z', status: 'BOOKED', appointmentStatus: 'BOOKED', facility: { id: 'facility', facilityName: 'Clinic', timezone: 'Asia/Kolkata' } };
test('directory paths, pagination and safe response projections match backend', async () => {
  const { createDirectoryApi } = await client();
  for (const [section, path, item] of [['doctors','doctors',doctor], ['slots','appointment-slots',slot], ['users','users',user]]) {
    const api = createDirectoryApi(async actual => { assert.equal(actual, `/admin/${path}?page=2&pageSize=20`); return Response.json({ items: [{ ...item, passwordHash: 'never-display', token: 'never-display' }], total: 25, page: 2, pageSize: 20 }); });
    const result = await api(section, 'page=2&pageSize=20'); assert.deepEqual(result.items, [item]); assert.equal(result.total, 25);
  }
  assert.deepEqual((await createDirectoryApi(async () => Response.json({ items: [], total: 0, page: 1, pageSize: 20 }))('users', '')).items, []);
});
test('filters use actual names, UTC timestamps and reject reversed ranges', async () => {
  const { directoryQuery } = await client();
  const form = new FormData(); form.set('applicationStatus','APPROVED');
  assert.equal(directoryQuery('doctors',form), 'page=1&pageSize=20&applicationStatus=APPROVED');
  form.set('role','PATIENT'); assert.equal(directoryQuery('users',form,2), 'page=2&pageSize=20&role=PATIENT');
  form.set('status','AVAILABLE'); form.set('from','2030-01-01T09:00'); form.set('to','2030-01-01T10:00');
  const query = new URLSearchParams(directoryQuery('slots',form)); assert.equal(query.get('from'),'2030-01-01T09:00:00.000Z'); assert.equal(query.get('status'),'AVAILABLE');
  form.set('to','2029-01-01T00:00'); assert.throws(() => directoryQuery('slots',form), /later/);
  form.delete('to'); form.set('facilityId','bad'); assert.throws(() => directoryQuery('slots',form), /UUID/);
});
test('errors and malformed data fail safely without provider details', async () => {
  const { createDirectoryApi } = await client();
  for (const status of [400,401,403,500]) await assert.rejects(createDirectoryApi(async () => Response.json({ message: 'private details' }, { status }))('users',''), error => !error.message.includes('private'));
  for (const response of [null, {}, { items: [], total: -1, page: 1, pageSize: 20 }, { items: [{ ...user, role: 'UNKNOWN' }], total: 1, page: 1, pageSize: 20 }]) await assert.rejects(createDirectoryApi(async () => Response.json(response))('users',''), /Invalid directory/);
});
test('real directory client uses cookie credentials and existing CSRF configuration', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/api/v1/admin/users?page=1&pageSize=20'));
    assert.equal(options.credentials,'include'); assert.equal(options.headers['X-CSRF-Protection'],'1'); assert.equal(options.method,'GET'); assert.equal(options.cache,'no-store');
    return Response.json({ items: [user], total: 1, page: 1, pageSize: 20 });
  });
  const { directoryApi } = await client(); assert.equal((await directoryApi('users','page=1&pageSize=20')).items[0].role,'DOCTOR');
});
