import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const encode=source=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64')}`;
async function client(){const auth=encode(await readFile(new URL('../components/features/auth/api.ts',import.meta.url),'utf8'));const source=(await readFile(new URL('../components/features/appointments/api.ts',import.meta.url),'utf8')).replace("'../auth/api'",JSON.stringify(auth));return import(encode(source));}
const id='e192565e-55ac-4391-b82f-ad098812f13d';const facility={id,facilityName:'Clinic',facilityType:'CLINIC',address:'Road',city:'Pune',timezone:'Asia/Kolkata',description:null,services:['Consultation']};const slot={id,startsAt:'2030-01-01T03:30:00Z',endsAt:'2030-01-01T04:00:00Z',booked:false};
const confirmation={id,status:'BOOKED',createdAt:'2030-01-01T00:00:00Z',facility,slot};
test('patient browsing and availability use actual public APIs with safe projections',async()=>{
 const {createBookingApi}=await client();const calls=[];const api=createBookingApi(async path=>{calls.push(path);return Response.json(path.includes('/slots?')?{timezone:'Asia/Kolkata',intervalMinutes:30,slots:[slot]}:path.includes('?')?{items:[facility],total:1,page:1,pageSize:20}:facility);});
 assert.deepEqual((await api.list('page=1')).items,[facility]);assert.deepEqual(await api.facility(id),facility);assert.equal((await api.availability(id,'2030-01-01')).slots[0].booked,false);
 assert.deepEqual(calls,['/facilities?page=1',`/facilities/${id}`,`/facilities/${id}/slots?date=2030-01-01`]);
});
test('success requires 201 BOOKED and booking sends only slot and normalized note',async()=>{
 const {createBookingApi,bookingPayload}=await client();
 const api=createBookingApi(async(path,options)=>{assert.equal(path,'/patient/appointments');assert.deepEqual(options,{method:'POST',body:{slotId:id,appointmentNote:'Checkup'}});return Response.json({...confirmation,passwordHash:'hidden'},{status:201});});
 const result=await api.book(id,' Checkup ');assert.equal(result.status,'BOOKED');assert.equal('passwordHash' in result,false);assert.equal('services' in result.facility,false);
 for(const [status,state] of [[200,'BOOKED'],[201,'PENDING']])await assert.rejects(createBookingApi(async()=>Response.json({...confirmation,status:state},{status})).book(id,''),/not confirmed/);
 assert.deepEqual(bookingPayload(id,'  '),{slotId:id});assert.throws(()=>bookingPayload('bad',''));assert.throws(()=>bookingPayload(id,'x'.repeat(2001)));
});
test('conflicts and auth failures retain status for slot refresh and login handling',async()=>{
 const {createBookingApi}=await client();for(const status of [400,401,403,404,409,500])await assert.rejects(createBookingApi(async()=>Response.json({message:'database secret'},{status})).book(id,''),error=>error.status===status&&!error.message.includes('secret'));
});
test('shared booking transport includes cookies and CSRF; displays facility timezone',async t=>{
 const {bookingApi,displaySlot}=await client();t.mock.method(globalThis,'fetch',async(url,options)=>{assert.ok(url.endsWith('/api/v1/patient/appointments'));assert.equal(options.credentials,'include');assert.equal(options.headers['X-CSRF-Protection'],'1');return Response.json(confirmation,{status:201});});
 assert.equal((await bookingApi.book(id,'')).status,'BOOKED');assert.match(displaySlot(slot.startsAt,'Asia/Kolkata'),/9:00|09:00/);
});
