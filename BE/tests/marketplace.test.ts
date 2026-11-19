import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import type {AddressInfo} from 'node:net';
import express from 'express';
import {createMarketplaceRouter} from '../src/routes/patient/marketplace.routes.js';
import {createMarketplace} from '../src/services/patient/marketplace.service.js';
import {errorHandler} from '../src/middleware/error-handler.js';
import {HttpError} from '../src/errors/http-error.js';
import {marketplaceSelect,publishedFacility,findFacility,listFacilities,facilityAvailability} from '../src/repositories/patient/marketplace.repository.js';

test('public facility routes validate pagination, IDs and dates without requiring login',async()=>{
 const id=randomUUID(); const facility={id,facilityName:'Clinic',facilityType:'CLINIC' as const,address:'Road',city:'Pune',description:null,services:['Consultation'],timezone:'Asia/Kolkata'};
 let calls=0;
 const service=createMarketplace({async listFacilities(input){calls++;assert.equal(input.page,2);assert.equal(input.city,'Pune');return {items:[facility],total:21,page:input.page,pageSize:input.pageSize};},async findFacility(value){calls++;if(value!==id)throw new HttpError(404,'Not found');return facility;},async facilityAvailability(value,date){calls++;assert.equal(value,id);assert.equal(date,'2030-01-01');return {timezone:'Asia/Kolkata',intervalMinutes:30,slots:[]};}});
 const app=express();app.use('/facilities',createMarketplaceRouter(service));app.use(errorHandler);const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path:string)=>fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/facilities${path}`);
 try{
  for(const path of ['?page=0','?pageSize=51','?page=1&page=2','?ownerId=x','/bad-id',`/${id}/slots?date=2030-02-30`,`/${id}/slots?date=2030-01-01&ownerId=x`])assert.equal((await request(path)).status,400);
  assert.equal(calls,0);assert.equal((await request('?page=2&city=Pune')).status,200);assert.deepEqual(await(await request(`/${id}`)).json(),facility);
  const slots=await request(`/${id}/slots?date=2030-01-01`);assert.equal(slots.status,200);assert.equal(slots.headers.get('cache-control'),'no-store');
  assert.equal((await request(`/${randomUUID()}`)).status,404);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('repositories scope every public read to approved active Doctor facilities and select safe fields',async()=>{
 const {getDatabase,disconnectDatabase}=await import('../src/config/database.js');const previous=process.env.DATABASE_URL;process.env.DATABASE_URL??='postgresql://test:test@localhost:5432/test';
 const db=getDatabase();const originals={transaction:db.$transaction,first:db.facility.findFirst,many:db.facility.findMany,count:db.facility.count};
 const id=randomUUID();const row={id,facilityName:'Clinic',facilityType:'CLINIC',address:'Road',city:'Pune',description:null,services:[{name:'Consultation'}],openingHours:{timezone:'Asia/Kolkata'}};
 const conditions:unknown[]=[];let exists=true,locks=0;
 const first=async(args:unknown)=>{const query=args as {where:Record<string,unknown>};conditions.push(query.where);return exists?row:null;};
 db.facility.findFirst=first as unknown as typeof db.facility.findFirst;
 db.facility.findMany=(async(args:unknown)=>{conditions.push((args as {where:unknown}).where);return [row];}) as unknown as typeof db.facility.findMany;
 db.facility.count=(async()=>1) as typeof db.facility.count;
 db.$transaction=(async(input:unknown)=>typeof input==='function'?input({$queryRaw:async()=>{locks++;return [];},facility:{findFirst:async(args:unknown)=>{await first(args);return exists?{openingHours:null}:null;}}}):Promise.all(input as Promise<unknown>[])) as typeof db.$transaction;
 try{
  const profile=await findFacility(id);assert.deepEqual(profile.services,['Consultation']);assert.equal(profile.timezone,'Asia/Kolkata');
  await listFacilities({page:1,pageSize:20,query:'Clinic'});assert.deepEqual(await facilityAvailability(id,'2030-01-01'),{timezone:null,intervalMinutes:30,slots:[]});assert.equal(locks,2);
  assert.ok(conditions.every(where=>JSON.stringify(where).includes(JSON.stringify(publishedFacility.application))));
  assert.doesNotMatch(JSON.stringify(marketplaceSelect),/password|token|email|contactPerson|applicant|patient|review/i);
  exists=false;await assert.rejects(findFacility(id),{status:404});await assert.rejects(facilityAvailability(id,'2030-01-01'),{status:404});
 }finally{db.$transaction=originals.transaction;db.facility.findFirst=originals.first;db.facility.findMany=originals.many;db.facility.count=originals.count;await disconnectDatabase();if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;}
});
test('availability generation conflicts return a safe retry response',async()=>{
 const service=createMarketplace({listFacilities,findFacility,async facilityAvailability(){throw {code:'P2034',message:'private'};}});
 await assert.rejects(service.slots(randomUUID(),'2030-01-01'),error=>error instanceof HttpError&&error.status===409&&!error.message.includes('private'));
});
