import test from 'node:test';
import assert from 'node:assert/strict';
import {changeOwnPassword,validatePasswordChange} from '../src/utils/changePassword.js';
const input={profileId:'current-user',currentPassword:'old password ',newPassword:' new password ',confirmation:' new password '};
function harness({wrong=false,network=false,changed=false,updateError=false,other=false}={}){
 const calls=[];let reads=0;
 const client={auth:{getUser:async()=>({data:{user:{id:changed&&++reads>1?'other':'current-user',email:'login@saams.local'}}}),updateUser:async value=>{calls.push(['update',value]);return {error:updateError?{message:'policy'}:null}}}};
 const verifier={auth:{signInWithPassword:async value=>{calls.push(['verify',value]);return {data:{user:{id:other?'another-user':'current-user'}},error:wrong?{code:'invalid_credentials',status:400}:network?{status:503}:null}},signOut:async value=>calls.push(['cleanup',value])}};
 return {client,verifier,calls};
}
test('current password is checked before updating and exact whitespace is preserved',async()=>{
 const h=harness();await changeOwnPassword({...h,...input});
 assert.deepEqual(h.calls,[['verify',{email:'login@saams.local',password:input.currentPassword}],['update',{password:input.newPassword}],['cleanup',{scope:'local'}]]);
});
test('incorrect current password never updates the account',async()=>{
 const h=harness({wrong:true});await assert.rejects(changeOwnPassword({...h,...input}),/CURRENT_PASSWORD_INCORRECT/);
 assert(!h.calls.some(([name])=>name==='update'));assert.equal(h.calls.at(-1)[0],'cleanup');
});
test('verification network failure is not reported as an incorrect password',async()=>{
 const h=harness({network:true});await assert.rejects(changeOwnPassword({...h,...input}),/PASSWORD_VERIFICATION_FAILED/);
 assert(!h.calls.some(([name])=>name==='update'));
});
test('confirmation mismatch and incomplete fields prevent authentication requests',async()=>{
 const h=harness();await assert.rejects(changeOwnPassword({...h,...input,confirmation:'different'}),/PASSWORD_MISMATCH/);
 await assert.rejects(changeOwnPassword({...h,...input,currentPassword:''}),/PASSWORD_FIELDS_REQUIRED/);assert.equal(h.calls.length,0);
 assert.throws(()=>validatePasswordChange('old','short','short'),/PASSWORD_TOO_SHORT/);
 assert.throws(()=>validatePasswordChange('password','password','password'),/PASSWORD_UNCHANGED/);
});
test('changing account during verification prevents a password update',async()=>{
 const h=harness({changed:true});await assert.rejects(changeOwnPassword({...h,...input}),/PASSWORD_SESSION_CHANGED/);assert(!h.calls.some(([name])=>name==='update'));
});
test('a mismatched verifier identity and a rejected update do not report success',async()=>{
 const other=harness({other:true});await assert.rejects(changeOwnPassword({...other,...input}),/PASSWORD_SESSION_CHANGED/);
 const h=harness({updateError:true});await assert.rejects(changeOwnPassword({...h,...input}),/PASSWORD_UPDATE_FAILED/);assert.equal(h.calls.at(-1)[0],'cleanup');
});
