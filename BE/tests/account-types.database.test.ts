import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { getDatabase, disconnectDatabase } from '../src/config/database.js';
import { env, requireDatabaseUrl } from '../src/config/env.js';
import { createAccountFixture } from './account-fixture.js';
import { createSession } from '../src/repositories/session.repository.js';

test('database enforces cross-table email and ID uniqueness under concurrency and resolves session owners', async () => {
 assert.equal(env.nodeEnv,'development'); assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(requireDatabaseUrl()).hostname));
 const db=getDatabase(); const ids:string[]=[]; const email=`${randomUUID()}@example.invalid`;
 try {
  const results=await Promise.allSettled(['PATIENT','ADMIN','DOCTOR'].map(role => {
   const id=randomUUID(); ids.push(id);
   return createAccountFixture({id, firstName:'Fixture',email,passwordHash:'fixture-hash',role:{connect:{name:role}}});
  }));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  for(const result of results) if(result.status==='rejected') assert.equal(result.reason.code,'P2002');
  const winner=results.find(r=>r.status==='fulfilled'); assert.ok(winner?.status==='fulfilled');
  const owner=winner.value.id;
  const session=await createSession({ userId:owner, tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+60000),ipAddress:'127.0.0.1' });
  assert.equal(session.ipAddress,'127.0.0.1'); assert.equal([session.patientId,session.adminId,session.doctorId].filter(Boolean).length,1);
  // The database normalizes email too, including callers that bypass repositories.
  await assert.rejects(db.doctor.create({data:{id:randomUUID(),firstName:'Fixture',email:` ${email.toUpperCase()} `,passwordHash:'hash',role:{connect:{name:'DOCTOR'}}}}),{code:'P2002'});
  const otherId=randomUUID(); ids.push(otherId);
  await createAccountFixture({id:otherId,firstName:'Fixture',email:`${otherId}@example.invalid`,passwordHash:'hash',role:{connect:{name:'DOCTOR'}}});
  await assert.rejects(db.doctor.update({where:{id:otherId},data:{email}}),{code:'P2002'});
  await assert.rejects(db.doctor.create({data:{id:owner,firstName:'Fixture',email:`${randomUUID()}@example.invalid`,passwordHash:'hash',role:{connect:{name:'DOCTOR'}}}}),{code:'P2002'});
  await assert.rejects(db.doctor.update({where:{id:otherId},data:{role:{connect:{name:'ADMIN'}}}}));
  await assert.rejects(db.session.create({data:{userId:randomUUID(),tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date()}}));
 } finally {
  for(const kind of ['patient','admin','doctor'] as const) await (db[kind] as typeof db.patient).deleteMany({where:{id:{in:ids}}});
  await disconnectDatabase();
 }
});
