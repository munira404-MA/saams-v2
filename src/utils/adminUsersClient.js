export async function requestAdminUsers(client,payload,{signal}={}){
 let {data}=await client.auth.getSession();
 let session=data?.session;
 if(!session){const refreshed=await client.auth.refreshSession();session=refreshed.data?.session}
 const send=async current=>{
  if(!current?.access_token){const error=new Error('Invalid session');error.code='INVALID_SESSION';throw error}
  return fetch('/api/admin-users',{method:'POST',cache:'no-store',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${current.access_token}`},body:JSON.stringify(payload)});
 };
 let response=await send(session);
 if(response.status===401){const refreshed=await client.auth.refreshSession();response=await send(refreshed.data?.session)}
 const result=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error(result.error||'REQUEST_FAILED');error.code=result.code||'';error.details=result;throw error}
 return result;
}

// Serialize loads so an earlier response cannot replace newer account changes.
export function watchUserDirectory({load,onData,onError,onLoading=()=>{},events,visibility,setTimer=setInterval,clearTimer=clearInterval,intervalMs=20000}){
 let stopped=false,running=false,pending=false;
 const controller=new AbortController();
 async function refresh(){
  if(stopped)return;
  if(running){pending=true;return}
  running=true;onLoading(true);
  try{const rows=await load(controller.signal);if(!stopped)onData(rows)}
  catch(error){if(!stopped)onError(error)}
  finally{running=false;if(!stopped){onLoading(false);if(pending){pending=false;refresh()}}}
 }
 const visibleRefresh=()=>{if(visibility.visibilityState!=='hidden')refresh()};
 events.addEventListener('saams:users-updated',refresh);
 events.addEventListener('focus',visibleRefresh);
 visibility.addEventListener('visibilitychange',visibleRefresh);
 const timer=setTimer(visibleRefresh,intervalMs);
 refresh();
 return ()=>{stopped=true;controller.abort();clearTimer(timer);events.removeEventListener('saams:users-updated',refresh);events.removeEventListener('focus',visibleRefresh);visibility.removeEventListener('visibilitychange',visibleRefresh)};
}
