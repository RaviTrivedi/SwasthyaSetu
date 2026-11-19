import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const encode = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`;
async function client() {
 const auth = encode(await readFile(new URL('../components/features/auth/api.ts', import.meta.url), 'utf8'));
 const source = (await readFile(new URL('../components/features/admin/applications-api.ts', import.meta.url), 'utf8')).replace("'../auth/api'", JSON.stringify(auth));
 return import(encode(source));
}
const item = { id: 'id-1', applicantId: 'user-1', facilityName: 'Test Clinic', facilityType: 'CLINIC', contactPersonName: 'Contact', contactEmail: 'contact@example.invalid', contactPhone: '+919876543210', address: 'Road', city: 'City', description: null, services: ['Consultation'], status: 'PENDING', createdAt: '2026-11-14T00:00:00Z', updatedAt: '2026-11-14T00:00:00Z', reviewedByAdminId: null, reviewedAt: null, rejectionReason: null, applicant: { id: 'user-1', firstName: 'Member', email: 'member@example.invalid' } };
test('list encodes backend filtering/pagination contract and supports an empty result', async () => {
 const { createApplicationApi } = await client();
 const api = createApplicationApi(async path => { assert.equal(path, '/admin/facility-applications?page=2&pageSize=20&status=REJECTED'); return Response.json({ items: [item], total: 21, page: 2, pageSize: 20 }); });
 assert.equal((await api.list(2,'REJECTED')).items[0].facilityName, 'Test Clinic');
 assert.deepEqual((await createApplicationApi(async () => Response.json({ items: [], total: 0, page: 1, pageSize: 20 })).list()).items, []);
});
test('detail and reviews use existing endpoints, exact payloads and no caller identity', async () => {
 const { createApplicationApi } = await client(); const calls = [];
 const api = createApplicationApi(async (path, options) => { calls.push({ path, options }); return Response.json(item); });
 await api.detail('id-1'); await api.review('id-1','APPROVED'); await api.review('id-1','REJECTED',' Needs corrections ');
 assert.deepEqual(calls, [
  { path: '/admin/facility-applications/id-1', options: undefined },
  { path: '/admin/facility-applications/id-1/status', options: { method: 'PATCH', body: { status: 'APPROVED' } } },
  { path: '/admin/facility-applications/id-1/status', options: { method: 'PATCH', body: { status: 'REJECTED', rejectionReason: 'Needs corrections' } } },
 ]);
 for (const reason of ['', ' ', 'x'.repeat(2001)]) await assert.rejects(api.review('id-1','REJECTED',reason), /rejection reason/);
 assert.equal(calls.length, 3);
});
test('API errors preserve status without exposing server details; malformed responses fail safely', async () => {
 const { createApplicationApi } = await client();
 for (const status of [401,403,404,409,500]) {
  const api = createApplicationApi(async () => Response.json({ message: 'private database details' }, { status }));
  await assert.rejects(api.detail('id-1'), error => error.status === status && !error.message.includes('private'));
 }
 await assert.rejects(createApplicationApi(async () => Response.json({ items: null })).list(), /Invalid application list/);
 await assert.rejects(createApplicationApi(async () => Response.json({ id: 'id' })).detail('id'), /Invalid application/);
});
test('real shared client sends cookies and CSRF on review', async t => {
 t.mock.method(globalThis, 'fetch', async (url, options) => {
  assert.ok(url.endsWith('/api/v1/admin/facility-applications/id-1/status'));
  assert.equal(options.credentials, 'include'); assert.equal(options.headers['X-CSRF-Protection'], '1');
  assert.equal(options.method, 'PATCH'); return Response.json({ ...item, status: 'APPROVED' });
 });
 const { applicationApi } = await client(); assert.equal((await applicationApi.review('id-1','APPROVED')).status, 'APPROVED');
});
