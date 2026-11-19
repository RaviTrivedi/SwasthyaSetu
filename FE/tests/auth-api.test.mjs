import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function client() {
  const source = await readFile(new URL('../components/features/auth/api.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}#${Math.random()}`);
}

test('headers and guards share one profile request; tab changes reuse it', async t => {
 const user = { id: 'admin', firstName: 'Admin', email: 'admin@example.invalid', role: 'ADMIN', createdAt: '2026-11-17T00:00:00Z' };
 let calls = 0;
 t.mock.method(globalThis, 'fetch', async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return Response.json({ user }); });
 const api = await client();
 const profiles = await Promise.all(Array.from({ length: 5 }, () => api.currentUser()));
 assert.equal(calls, 1); assert.ok(profiles.every(profile => profile.role === 'ADMIN'));
 for (let tab = 0; tab < 6; tab++) assert.deepEqual(await api.currentUser(), user);
 assert.equal(calls, 1); assert.deepEqual(api.sessionSnapshot(), user);
});

test('login seeds session without me; logout clears it and notifies consumers', async t => {
 const calls = []; const user = { id: 'admin', role: 'ADMIN' };
 t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return Response.json(url.endsWith('/login') ? { user } : {}); });
 const api = await client(); let changes = 0; const unsubscribe = api.subscribeSession(() => changes++);
 await api.staffLogin('ADMIN','admin@example.invalid','test-password'); assert.deepEqual(await api.currentUser(),user);
 await api.logout(); assert.equal(await api.currentUser(),null); assert.equal(changes,2); unsubscribe();
 assert.equal(calls.length,2); assert.ok(calls.every(url => !url.endsWith('/me')));
});

test('an old me response cannot restore a signed-out session; errors allow retry', async t => {
 let resolveProfile;
 const api = await client();
 t.mock.method(globalThis,'fetch', async url => url.endsWith('/me') ? new Promise(resolve => { resolveProfile = resolve; }) : Response.json({}));
 const pending = api.currentUser(); await api.logout(); resolveProfile(Response.json({ user: { id: 'old', role: 'ADMIN' } }));
 assert.equal(await pending,null); assert.equal(api.sessionSnapshot(),null);
 const other = await client(); let calls = 0;
 t.mock.method(globalThis,'fetch', async () => { calls++; return calls === 1 ? new Response('{}',{ status:500 }) : Response.json({ user:{id:'new',role:'ADMIN'} }); });
 await assert.rejects(other.currentUser()); assert.equal((await other.currentUser()).id,'new'); assert.equal(calls,2);
});

test('failed refresh clears cached session after a protected API rejects it', async t => {
 const api = await client();
 t.mock.method(globalThis,'fetch', async () => Response.json({ user: { id:'admin',role:'ADMIN' } }));
 await api.currentUser();
 t.mock.method(globalThis,'fetch', async () => new Response('{}',{status:401}));
 assert.equal((await api.apiRequest('/admin/users')).status,401);
 assert.equal(api.sessionSnapshot(),null);
});
test('concurrent 401s refresh once and retry JSON requests with cookies and CSRF header', async t => {
  const calls = [];
  let refreshed = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.credentials, 'include');
    if (url.endsWith('/auth/me')) return new Response('{}', { status: 401 });
    if (url.endsWith('/auth/refresh')) {
      assert.equal(options.headers['X-CSRF-Protection'], '1');
      await new Promise(resolve => setTimeout(resolve, 10)); refreshed = true;
      return new Response('{"message":"Session refreshed"}');
    }
    assert.equal(options.headers['X-CSRF-Protection'], '1');
    return new Response('{}', { status: refreshed ? 200 : 401 });
  });
  const { apiRequest } = await client();
  const results = await Promise.all([apiRequest('/one', { method: 'PATCH', body: { status: 'PENDING' } }), apiRequest('/two')]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.equal(calls.filter(call => call.url.endsWith('/auth/refresh')).length, 1);
  const writes = calls.filter(call => call.url.endsWith('/one'));
  assert.equal(writes.length, 2); assert.equal(writes[0].options.body, writes[1].options.body);
});
test('login failures and server errors are never automatically replayed', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}', { status: 401 }); });
  const { apiRequest } = await client();
  assert.equal((await apiRequest('/auth/login', { method: 'POST', refresh: false })).status, 401);
  assert.equal(calls, 1);
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}', { status: 500 }); });
  assert.equal((await apiRequest('/write', { method: 'POST' })).status, 500);
  assert.equal(calls, 2);
});

test('Admin and Doctor login use role endpoints, cookies, and their existing dashboards', async t => {
 for (const [role, endpoint, dashboard] of [['ADMIN','/admin/auth/login','/admin'], ['DOCTOR','/clinic/auth/login','/workspace']]) {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
   assert.ok(url.endsWith(endpoint)); assert.equal(options.credentials, 'include');
   assert.equal(options.headers['X-CSRF-Protection'], '1');
   assert.deepEqual(JSON.parse(options.body), { email: 'member@example.com', password: 'password' });
   return Response.json({ user: { id: 'id', role } });
  });
  const { staffLogin } = await client();
  assert.equal((await staffLogin(role, ' MEMBER@EXAMPLE.COM ', 'password')).dashboard, dashboard);
 }
});
test('wrong credentials and wrong account roles have a generic error and do not retry', async t => {
 for (const response of [() => Response.json({ message: 'private detail' }, { status: 401 }), () => Response.json({ user: { role: 'PATIENT' } })]) {
  let calls = 0; t.mock.method(globalThis, 'fetch', async () => { calls++; return response(); });
  const { staffLogin } = await client();
  await assert.rejects(staffLogin('DOCTOR', 'test@example.com', 'wrong'), { message: 'Invalid email or password for the selected login option.' });
  assert.equal(calls, 1);
 }
});

async function policy() {
 const source = await readFile(new URL('../components/features/auth/access-policy.ts', import.meta.url), 'utf8');
 const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
 return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
test('role route policy keeps marketplace public and isolates patient, Doctor and admin pages', async () => {
 const { pageRole, allowedPage } = await policy();
 for (const path of ['/', '/search', '/facilities/clinic-one', '/doctors/doctor-one']) {
  assert.equal(pageRole(path), 'PUBLIC'); assert.equal(allowedPage('PATIENT', path), true);
  assert.equal(allowedPage('DOCTOR', path), false); assert.equal(allowedPage('ADMIN', path), false);
 }
 for (const [role, path] of [['PATIENT','/appointments/new'], ['DOCTOR','/workspace'], ['ADMIN','/admin/facilities']]) {
  assert.equal(allowedPage(role, path), true);
  for (const other of ['PATIENT','DOCTOR','ADMIN'].filter(item => item !== role)) assert.equal(allowedPage(other, path), false);
 }
});
test('return destinations reject external, encoded, traversal, login loops and wrong-role paths', async () => {
 const { safeReturnPath } = await policy();
 for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/admin/../workspace', '/sign-in', '/sign-up', '/admin', '/workspace', '/appointments/%2e%2e/admin', '/appointments\n']) assert.equal(safeReturnPath(path, 'PATIENT'), null);
 assert.equal(safeReturnPath('/appointments/new?facilityId=abc', 'PATIENT'), '/appointments/new?facilityId=abc');
 assert.equal(safeReturnPath('/admin/facilities', 'ADMIN'), '/admin/facilities');
 assert.equal(safeReturnPath('/workspace', 'DOCTOR'), '/workspace');
});
test('patient login uses existing cookie endpoint and patient home', async t => {
 t.mock.method(globalThis, 'fetch', async (url, options) => {
  assert.ok(url.endsWith('/auth/login')); assert.equal(options.credentials, 'include');
  return Response.json({ user: { id: 'patient', role: 'PATIENT' } });
 });
 const { staffLogin } = await client(); assert.equal((await staffLogin('PATIENT','patient@example.com','password')).dashboard, '/');
});
