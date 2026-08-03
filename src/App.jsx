import { useEffect,useState } from 'react';
import { supabase } from './supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';import Advances from './pages/Advances';import Assets from './pages/Assets';import Reports from './pages/Reports';import Users from './pages/Users';import Settings from './pages/Settings';
const pages={dashboard:Dashboard,invoices:Invoices,advances:Advances,assets:Assets,reports:Reports,users:Users,settings:Settings};
export default function App(){const [lang,setLang]=useState('ar'),[session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[active,setActive]=useState('dashboard');
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr'},[lang]);
 useEffect(()=>{let ok=true;async function load(s){setSession(s);setProfile(null);if(s?.user?.id){const {data,error}=await supabase.from('profiles').select('*').eq('id',s.user.id).single();if(ok){if(error)setError(lang==='ar'?'تم الدخول لكن ملف المستخدم غير موجود.':'Signed in but profile was not found.');else setProfile(data)}}setLoading(false)}supabase.auth.getSession().then(({data})=>load(data.session));const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>load(s));return()=>{ok=false;l.subscription.unsubscribe()}},[]);
 async function login(f){setBusy(true);setError('');const email=f.username.trim().toLowerCase()==='admin'?import.meta.env.VITE_ADMIN_EMAIL:`${f.username.trim().toLowerCase()}@${import.meta.env.VITE_USER_EMAIL_DOMAIN||'saams.app'}`;const {error}=await supabase.auth.signInWithPassword({email,password:f.password});if(error)setError(lang==='ar'?'اسم المستخدم أو كلمة المرور غير صحيحة.':'Invalid username or password.');setBusy(false)}
 if(loading)return <div className="center">Loading...</div>;if(!session)return <Login lang={lang} setLang={setLang} onLogin={login} busy={busy} error={error}/>;const Page=pages[active]||Dashboard;return <Layout lang={lang} setLang={setLang} profile={profile} onLogout={()=>supabase.auth.signOut()} active={active} setActive={setActive}><Page lang={lang}/></Layout>}
