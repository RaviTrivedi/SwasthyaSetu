import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function client() {
  const source = await readFile(new URL('../components/features/auth/api.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}#${Math.random()}`);
}
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
