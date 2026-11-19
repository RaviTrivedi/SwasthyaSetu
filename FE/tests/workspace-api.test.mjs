import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const encode = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64')}`;
async function client() {
 const auth = encode(await readFile(new URL('../components/features/auth/api.ts', import.meta.url), 'utf8'));
 const source = (await readFile(new URL('../components/features/workspace/api.ts', import.meta.url), 'utf8')).replace("'../auth/api'", JSON.stringify(auth));
 return import(encode(source));
}
const timestamp = '2030-01-01T00:00:00Z';
const facility = { id:'facility', facilityName:'Clinic', facilityType:'CLINIC', contactPersonName:'Owner', contactEmail:'owner@example.invalid', contactPhone:'+919876543210', address:'Road', city:'Pune', description:null, services:['Consultation'], createdAt:timestamp, updatedAt:timestamp };
const service = { id:'service', name:'Consultation', createdAt:timestamp, updatedAt:timestamp };
const hours = { timezone:'Asia/Kolkata', days:Array.from({length:7}, (_,day) => ({ day, periods:day === 1 ? [{open:'09:00',close:'11:00'}] : [] })) };
const slots = { timezone:'Asia/Kolkata', intervalMinutes:30, slots:[{id:'slot', startsAt:timestamp, endsAt:'2030-01-01T00:30:00Z', booked:true}] };

test('Doctor profile and service APIs use exact paths, methods and safe responses', async () => {
 const {createWorkspaceApi} = await client(); const calls = [];
 const api = createWorkspaceApi(async (path,options) => {
  calls.push({path,options});
  if(options?.method === 'DELETE') return new Response(null,{status:204});
  if(path.endsWith('/services') && !options) return Response.json([service]);
  return Response.json(path.includes('/services') ? service : {...facility,passwordHash:'not-exposed'});
 });
 assert.deepEqual(await api.profile(),facility);
 const input = {facilityName:'Renamed',facilityType:'CLINIC',contactPersonName:'Owner',contactEmail:'owner@example.invalid',contactPhone:'+919876543210',address:'Road',city:'Pune',description:''};
 await api.updateProfile(input); assert.deepEqual(calls[1],{path:'/doctor/facility',options:{method:'PATCH',body:input}});
 assert.deepEqual(await api.services(),[service]); await api.addService(' Consultation '); await api.updateService('service',' Updated '); await api.removeService('service');
 assert.deepEqual(calls.slice(2),[
  {path:'/doctor/facility/services',options:undefined},
  {path:'/doctor/facility/services',options:{method:'POST',body:{name:'Consultation'}}},
  {path:'/doctor/facility/services/service',options:{method:'PATCH',body:{name:'Updated'}}},
  {path:'/doctor/facility/services/service',options:{method:'DELETE'}},
 ]);
 await assert.rejects(api.addService('  ')); await assert.rejects(api.updateService('service','x'.repeat(101)));
});
test('profile fields normalize and reject invalid values; identity and approval fields never enter payload', async () => {
 const {profilePayload} = await client(); const form = new FormData();
 for(const [key,value] of Object.entries({...facility,description:'',services:' Consultation\n Testing ',contactEmail:' OWNER@EXAMPLE.INVALID ',ownerId:'attacker',status:'APPROVED'})) form.set(key,String(value));
 const value = profilePayload(form); assert.equal(value.contactEmail,'owner@example.invalid'); assert.deepEqual(value.services,['Consultation','Testing']); assert.equal('id' in value,false); assert.equal('ownerId' in value,false); assert.equal('status' in value,false);
 assert.equal('services' in profilePayload(form,false),false);
 form.set('contactPhone','123'); assert.throws(() => profilePayload(form), /digits/);
 form.set('contactPhone',facility.contactPhone); form.set('services',''); assert.throws(() => profilePayload(form), /1–50/);
});
test('schedule supports closed days and multiple periods, and validates overlap, format and timezone', async () => {
 const {validateSchedule} = await client(); assert.deepEqual(validateSchedule(hours),hours);
 const valid = structuredClone(hours); valid.days[1].periods.push({open:'11:00',close:'12:00'}); assert.deepEqual(validateSchedule(valid),valid);
 for(const periods of [[{open:'09:00',close:'09:00'}],[{open:'23:00',close:'01:00'}],[{open:'9:00',close:'10:00'}],[{open:'09:00',close:'11:00'},{open:'10:30',close:'12:00'}]]) { const invalid = structuredClone(hours); invalid.days[1].periods = periods; assert.throws(() => validateSchedule(invalid)); }
 assert.throws(() => validateSchedule({...hours,timezone:'invalid-zone'})); assert.throws(() => validateSchedule({...hours,days:hours.days.slice(1)}));
});
test('schedule replacement and slot queries follow backend without deleting or changing booked slots', async () => {
 const {createWorkspaceApi,slotQuery} = await client(); const calls = [];
 const api = createWorkspaceApi(async (path,options) => { calls.push({path,options}); return Response.json(path.includes('/slots?') ? slots : hours); });
 assert.deepEqual(await api.hours(),hours); assert.deepEqual(await api.saveHours(hours),hours); assert.deepEqual(await api.slots('2030-01-01','2030-01-31'),slots);
 assert.deepEqual(calls,[{path:'/doctor/facility/opening-hours',options:undefined},{path:'/doctor/facility/opening-hours',options:{method:'PUT',body:hours}},{path:'/doctor/facility/slots?from=2030-01-01&to=2030-01-31',options:undefined}]);
 for(const [from,to] of [['2030-01-01','2030-02-01'],['2030-02-01','2030-01-01'],['2030-02-30','2030-03-01']]) assert.throws(() => slotQuery(from,to));
});
test('authorization/errors and malformed data are safe; actual client sends cookie credentials and CSRF', async t => {
 const {createWorkspaceApi,workspaceApi} = await client();
 for(const status of [400,401,403,404,409,500]) await assert.rejects(createWorkspaceApi(async () => Response.json({message:'private database error'},{status})).profile(), error => error.status === status && !error.message.includes('private'));
 await assert.rejects(createWorkspaceApi(async () => Response.json({})).profile(),/Invalid/);
 await assert.rejects(createWorkspaceApi(async () => Response.json({...slots,intervalMinutes:15})).slots('2030-01-01','2030-01-01'),/Invalid/);
 t.mock.method(globalThis,'fetch',async (url,options) => { assert.ok(url.endsWith('/api/v1/doctor/facility/opening-hours')); assert.equal(options.method,'PUT'); assert.equal(options.credentials,'include'); assert.equal(options.headers['X-CSRF-Protection'],'1'); assert.deepEqual(JSON.parse(options.body),hours); return Response.json(hours); });
 await workspaceApi.saveHours(hours);
});
