import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileContactPayload,personalProfileFields,withoutSharedProfile} from '../src/utils/profileFields.js';

test('shared browser settings never supply personal data to another account',()=>{
 const legacy={profile:{email:'old-owner@example.com',titleAr:'Owner Title'},invoice:{aiEnabled:true}};
 assert.deepEqual(withoutSharedProfile(legacy),{invoice:{aiEnabled:true}});
 assert.deepEqual(personalProfileFields({id:'mohamed',email:'mohamed@saams.local'}),{contact_email:'',job_title_ar:'',job_title_en:''});
 assert.equal(personalProfileFields({id:'munira',contact_email:'owner@example.com'}).contact_email,'owner@example.com');
 assert.equal(personalProfileFields({id:'mohamed'}).contact_email,'');
});
test('contact fields accept blanks and validate email and title limits',()=>{
 assert.deepEqual(profileContactPayload({contact_email:' mohamed@example.com ',job_title_ar:' مسؤول الأصول ',job_title_en:''}),{contact_email:'mohamed@example.com',job_title_ar:'مسؤول الأصول',job_title_en:null});
 assert.deepEqual(profileContactPayload({},true),{});
 assert.deepEqual(profileContactPayload({contact_email:''},true),{contact_email:null});
 assert.throws(()=>profileContactPayload({contact_email:'wrong'}),/INVALID_CONTACT_EMAIL/);
 assert.throws(()=>profileContactPayload({job_title_ar:'a'.repeat(201)}),/PROFILE_FIELD_TOO_LONG/);
});

test('authenticated profile uses its own database fields and ignores synthetic Auth email',async()=>{
 const source=readFileSync(new URL('../src/data/supabaseData.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('export async function getCurrentProfile'),source.indexOf('export async function signInWithUsername')).replace('export ','');
 let row={id:'mohamed',username:'mohamed',contact_email:null,job_title_ar:null};
 const supabase={auth:{getUser:async()=>({data:{user:{id:'mohamed',email:'mohamed@saams.local'}}})},from:()=>({select(){return this},eq(field,id){assert.equal(id,'mohamed');return this},single:async()=>({data:row,error:null})})};
 const getProfile=new Function('supabase',code+';return getCurrentProfile')(supabase);
 assert.equal((await getProfile()).email,'');
 row={...row,contact_email:'mohamed@example.com',job_title_ar:'مسؤول الأصول'};
 const actual=await getProfile();
 assert.equal(actual.contact_email,'mohamed@example.com');
 assert.equal(actual.job_title_ar,'مسؤول الأصول');
});

const apiSource=readFileSync(new URL('../api/admin-users.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace('export default async function handler','async function handler');
function apiHarness(role='super_admin'){
 const writes=[],authWrites=[];
 const profileRows=[{id:'mohamed',username:'mohamed',contact_email:'mohamed@example.com',job_title_ar:'مسؤول الأصول'}];
 const admin={from:()=>{
  const q={select(){return this},eq(){return this},order:async()=>({data:profileRows}),single:async()=>({data:{role,active:true,username:'caller'}}),insert(value){writes.push(value);return this},update(value){writes.push(value);return this},then(resolve){return Promise.resolve({error:null}).then(resolve)}};return q;
 },auth:{admin:{listUsers:async()=>({data:{users:[]}}),createUser:async payload=>{authWrites.push(payload);return {data:{user:{id:'new'}},error:null}},updateUserById:async(id,payload)=>{authWrites.push(payload);return {error:null}}}}};
 const user={auth:{getUser:async()=>({data:{user:{id:'caller'}}})}};
 const handler=new Function('createClient','supabaseClientOptions','profileContactPayload','process',apiSource+';return handler')((url,key)=>key==='anon'?user:admin,()=>({}),profileContactPayload,{env:{SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}});
 async function request(body){const res={status(code){this.code=code;return this},json(value){this.body=value;return this}};await handler({method:'POST',headers:{authorization:'Bearer token'},body},res);return res}
 return {request,writes,authWrites};
}
test('administrator can create a contact profile without changing username login',async()=>{
 const h=apiHarness();const res=await h.request({action:'create',user:{username:'mohamed',password:'example-pass',full_name:'Mohamed',role:'admin',contact_email:'mohamed@example.com',job_title_ar:'مسؤول الأصول'}});
 assert.equal(res.code,200);
 assert.equal(h.writes[0].contact_email,'mohamed@example.com');
 assert.equal(h.writes[0].job_title_ar,'مسؤول الأصول');
 assert.equal(h.authWrites[0].email,'mohamed@saams.local');
 assert.equal(res.body.users[0].contact_email,'mohamed@example.com');
});
test('contact update targets selected user and ordinary users are rejected',async()=>{
 const h=apiHarness();const res=await h.request({action:'update',id:'mohamed',user:{username:'mohamed',full_name:'Mohamed',role:'admin',contact_email:'new@example.com',job_title_en:'Asset Officer'}});
 assert.equal(res.code,200);assert.equal(h.writes[0].contact_email,'new@example.com');assert.equal(h.writes[0].job_title_en,'Asset Officer');
 const denied=apiHarness('admin');assert.equal((await denied.request({action:'update',id:'other',user:{contact_email:'x@example.com'}})).code,403);assert.equal(denied.writes.length,0);
});
test('invalid contact is rejected before creating Auth accounts',async()=>{
 const h=apiHarness();const res=await h.request({action:'create',user:{contact_email:'wrong'}});
 assert.equal(res.code,400);assert.equal(h.authWrites.length,0);
});
