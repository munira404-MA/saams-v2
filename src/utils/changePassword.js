export function validatePasswordChange(currentPassword,newPassword,confirmation){
 if(!currentPassword||!newPassword||!confirmation)throw new Error('PASSWORD_FIELDS_REQUIRED');
 if(newPassword!==confirmation)throw new Error('PASSWORD_MISMATCH');
 if(newPassword.length<8)throw new Error('PASSWORD_TOO_SHORT');
 if(newPassword===currentPassword)throw new Error('PASSWORD_UNCHANGED');
}

export async function changeOwnPassword({client,verifier,profileId,currentPassword,newPassword,confirmation}){
 validatePasswordChange(currentPassword,newPassword,confirmation);
 const {data,error}=await client.auth.getUser();
 const user=data?.user;
 if(error||!user?.email||user.id!==profileId)throw new Error('PASSWORD_SESSION_CHANGED');
 try{
  // Separate in-memory session: checking the password must not replace the
  // application's session or persist the user's current password in storage.
  const check=await verifier.auth.signInWithPassword({email:user.email,password:currentPassword});
  if(check.error){
   if(check.error.code==='invalid_credentials'||check.error.status===400)throw new Error('CURRENT_PASSWORD_INCORRECT');
   throw new Error('PASSWORD_VERIFICATION_FAILED');
  }
  if(check.data?.user?.id!==profileId)throw new Error('PASSWORD_SESSION_CHANGED');
  const latest=await client.auth.getUser();
  if(latest.error||latest.data?.user?.id!==profileId)throw new Error('PASSWORD_SESSION_CHANGED');
  const updated=await client.auth.updateUser({password:newPassword});
  if(updated.error)throw new Error('PASSWORD_UPDATE_FAILED');
 }finally{
  try{await verifier.auth.signOut({scope:'local'})}catch{}
 }
}
