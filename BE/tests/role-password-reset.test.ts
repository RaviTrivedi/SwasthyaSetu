import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { verify } from '@node-rs/argon2';
import { createAdminPasswordReset } from '../src/services/admin/password-reset.service.js';
import { createDoctorPasswordReset } from '../src/services/clinic/password-reset.service.js';
import { createAdminAuthRouter } from '../src/routes/admin/auth.routes.js';
import { createClinicAuthRouter } from '../src/routes/clinic/auth.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { browserAccess } from '../src/middleware/browser-access.js';
import { app } from '../src/app.js';

for (const kind of ['admin','doctor'] as const) test(`${kind} recovery validates input, scopes persistence, clears cookies and returns safe responses`, async () => {
 let tokenHash: string | undefined; let savedPassword = ''; let deliveredToken = ''; let failDelivery = false; let expiry = new Date(); let revoked = false;
 const data = {
  async findResetUser(email: string, scope?: string) { assert.equal(scope,kind); return email === 'known@example.invalid' ? {id:'fixture',email} : null; },
  async createResetToken(input: {userId:string;tokenHash:string;expiresAt:Date}, scope?: string) { assert.equal(scope,kind); tokenHash=input.tokenHash; expiry=input.expiresAt; return {id:tokenHash}; },
  async revokeResetToken(id: string, scope?: string) { assert.equal(scope,kind); assert.equal(id,tokenHash); tokenHash=undefined; revoked=true; return {count:1}; },
  async consumeResetToken(hash: string, password: string, scope?: string) { assert.equal(scope,kind); if(hash !== tokenHash || expiry <= new Date()) return false; tokenHash=undefined; savedPassword=password; return true; },
 };
 const factory = kind === 'admin' ? createAdminPasswordReset : createDoctorPasswordReset;
 const service = factory(data, async input => { deliveredToken=input.token; if(failDelivery) throw new Error('private provider details'); }, () => {});
 const application=express(); application.use(browserAccess);
 application.use('/auth',kind==='admin' ? createAdminAuthRouter(undefined,undefined,service) : createClinicAuthRouter(undefined,undefined,undefined,service)); application.use(errorHandler);
 const server=application.listen(0,'127.0.0.1'); await once(server,'listening');
 const post=(path:string,body:unknown)=>fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify(body)});
 try {
  assert.equal((await post('forgot-password',{email:'bad'})).status,400);
  assert.equal((await post('forgot-password',{email:'known@example.invalid',role:'ADMIN'})).status,400);
  const known=await post('forgot-password',{email:' KNOWN@EXAMPLE.INVALID '}); assert.equal(known.status,200); const generic=await known.json();
  const unknown=await post('forgot-password',{email:'unknown@example.invalid'}); assert.equal(unknown.status,200); assert.deepEqual(await unknown.json(),generic);
  assert.match(deliveredToken,/^[A-Za-z0-9_-]{43}$/); assert.equal(tokenHash,createHash('sha256').update(deliveredToken).digest('hex'));
  assert.ok(!JSON.stringify(generic).includes(deliveredToken));
  assert.equal((await post('reset-password',{token:deliveredToken,newPassword:'short'})).status,400);
  const password=randomBytes(20).toString('hex');
  const reset=await post('reset-password',{token:deliveredToken,newPassword:password}); assert.equal(reset.status,200);
  assert.deepEqual(Object.keys(await reset.json()),['message']); assert.ok(await verify(savedPassword,password));
  const cookies=reset.headers.getSetCookie(); assert.equal(cookies.length,2); for(const cookie of cookies){assert.match(cookie,/HttpOnly/);assert.match(cookie,/Expires=Thu, 01 Jan 1970/);}
  assert.ok(cookies.some(cookie=>cookie.startsWith('refresh_token=')&&cookie.includes('Path=/api/v1/auth')));
  assert.ok(cookies.some(cookie=>cookie.startsWith('access_token=')&&cookie.includes('Path=/api/v1;')));
  assert.equal((await post('reset-password',{token:deliveredToken,newPassword:password})).status,400);
  assert.equal((await post('reset-password',{token:randomBytes(32).toString('base64url'),newPassword:password})).status,400);
  assert.equal((await post('password-reset/request',{email:'known@example.invalid'})).status,200);
  expiry=new Date(0); assert.equal((await post('password-reset/confirm',{token:deliveredToken,newPassword:password})).status,400);
  failDelivery=true; const failure=await post('forgot-password',{email:'known@example.invalid'}); assert.equal(failure.status,200); assert.deepEqual(await failure.json(),generic); assert.ok(revoked);
 } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

test('admin and clinic reset routes are mounted and reject invalid bodies before delivery',async()=>{
 const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
 try { for(const prefix of ['admin','clinic']) for(const path of ['forgot-password','reset-password','password-reset/request','password-reset/confirm']) {
  const response=await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/${prefix}/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:'{}'}); assert.equal(response.status,400);
 } } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
