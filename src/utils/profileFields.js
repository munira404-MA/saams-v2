export const CONTACT_FIELDS=['contact_email','job_title_ar','job_title_en'];

export function profileContactPayload(user={},partial=false){
 const result={};
 for(const field of CONTACT_FIELDS){
  if(partial&&!Object.prototype.hasOwnProperty.call(user,field))continue;
  const value=String(user[field]??'').trim();
  if(value.length>(field==='contact_email'?254:200))throw new Error('PROFILE_FIELD_TOO_LONG');
  if(field==='contact_email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('INVALID_CONTACT_EMAIL');
  result[field]=value||null;
 }
 return result;
}

export function personalProfileFields(profile){
 return Object.fromEntries(CONTACT_FIELDS.map(field=>[field,String(profile?.[field]||'')]));
}

// Old system-wide personal data has no reliable owner. Never assign it to a user.
export function withoutSharedProfile(settings={}){
 const {profile,...systemSettings}=settings;
 return systemSettings;
}
