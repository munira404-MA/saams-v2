import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchUserDirectory,requestAdminUsers} from '../src/utils/adminUsersClient.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('settings refreshes additions, disabled users and deletions, then cleans up',async()=>{
 const events=new EventTarget(),visibility=new EventTarget();visibility.visibilityState='visible';
 let rows=[{id:'1',active:true}],seen=[],timer,cleared=false;
 const stop=watchUserDirectory({load:async()=>rows,onData:data=>seen.push(data),onError:error=>{throw error},events,visibility,setTimer:cb=>{timer=cb;return 1},clearTimer:()=>cleared=true});
 await tick();assert.equal(seen.at(-1).length,1);
 rows=[...rows,{id:'2',active:true}];events.dispatchEvent(new Event('saams:users-updated'));await tick();assert.equal(seen.at(-1).length,2);
 rows=rows.map(row=>row.id==='2'?{...row,active:false}:row);timer();await tick();assert.equal(seen.at(-1).filter(r=>r.active!==false).length,1);
 rows=rows.slice(1);events.dispatchEvent(new Event('focus'));await tick();assert.equal(seen.at(-1).length,1);
 visibility.visibilityState='hidden';const before=seen.length;timer();await tick();assert.equal(seen.length,before);
 stop();assert(cleared);events.dispatchEvent(new Event('saams:users-updated'));await tick();assert.equal(seen.length,before);
});
test('in-flight user changes request a fresh load and errors preserve last success',async()=>{
 const events=new EventTarget(),visibility=new EventTarget();visibility.visibilityState='visible';
 let resolveFirst,loads=0,seen=[],errors=[];
 const stop=watchUserDirectory({load:()=>{loads++;if(loads===1)return new Promise(resolve=>resolveFirst=resolve);if(loads===2)return Promise.resolve([{id:'new'}]);throw new Error('offline')},onData:data=>seen.push(data),onError:error=>errors.push(error),events,visibility,setTimer:()=>1,clearTimer(){}});
 events.dispatchEvent(new Event('saams:users-updated'));assert.equal(loads,1);
 resolveFirst([{id:'old'}]);await tick();assert.equal(loads,2);assert.equal(seen.at(-1)[0].id,'new');
 events.dispatchEvent(new Event('focus'));await tick();assert.equal(errors.length,1);assert.equal(seen.at(-1)[0].id,'new');stop();
});
test('cleanup ignores responses arriving after switching accounts',async()=>{
 let resolve,seen=0;const events=new EventTarget(),visibility=new EventTarget();
 const stop=watchUserDirectory({load:()=>new Promise(r=>resolve=r),onData:()=>seen++,onError(){},events,visibility,setTimer:()=>1,clearTimer(){}});
 stop();resolve([{id:'other-account'}]);await tick();assert.equal(seen,0);
});
test('production directory paginates all accounts beyond the database row cap',async()=>{
 const source=readFileSync(new URL('../api/admin-users.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('async function listUsers'),source.indexOf('async function runAuthAdmin'));
 const list=new Function(code+';return listUsers')();const rows=Array.from({length:1205},(_,i)=>({id:String(i),active:i%2===0,role:i%3===0?'nursery':'admin'}));let calls=0;
 const admin={from:()=>({select(){return this},order(){return this},range:async(from,to)=>{calls++;return {data:rows.slice(from,to+1)}}}),auth:{admin:{listUsers:async()=>({data:{users:[]}})}}};
 const actual=await list(admin);assert.equal(actual.length,1205);assert.equal(calls,3);assert.equal(actual.filter(r=>r.active).length,603);
});
test('directory requests use the authenticated API without cached responses',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/admin-users');assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,'Bearer session-token');return {ok:true,status:200,json:async()=>({users:[{id:'actual-user'}]})}};
  const client={auth:{getSession:async()=>({data:{session:{access_token:'session-token'}}})}};
  assert.equal((await requestAdminUsers(client,{action:'list'})).users[0].id,'actual-user');
 }finally{globalThis.fetch=previous}
});
