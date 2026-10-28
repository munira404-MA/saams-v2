
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Assets from './pages/Assets';
import Advances from './pages/Advances';
import Reports from './pages/Reports';
import Users, { loadUsers } from './pages/Users';
import Settings from './pages/Settings';
import ExecutiveCommandCenter from './pages/ExecutiveCommandCenter';
import Attachments from './pages/Attachments';
import SplashScreen from './components/SplashScreen';
import Help from './pages/Help';
import About from './pages/About';
import TransportTasks from './pages/TransportTasks';
import Layout from './components/Layout';
import { supabase, supabaseConfigured } from './supabase';
import { getCurrentProfile, signInWithUsername, signOut } from './data/supabaseData';
import { useLanguageDomGuard } from './utils/globalI18n';

const PREVIEW_PROFILE_KEY = 'saams-preview-profile';

// Tell the user the real reason a sign-in failed instead of one generic message.
function loginErrorMessage(error, ar) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || error?.error_code || '').toLowerCase();
  if (msg === 'account_disabled') return ar ? 'هذا الحساب موقوف. يرجى التواصل مع الإدارة.' : 'This account is disabled. Contact administration.';
  if (msg === 'invalid_username') return ar ? 'اكتبي اسم المستخدم بالأحرف الإنجليزية.' : 'Enter the username in English letters.';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return ar ? 'اسم المستخدم أو كلمة المرور غير صحيحة. تأكدي من كتابة اسم المستخدم كما هو في شاشة المستخدمين، أو اطلبي من مدير النظام تعيين كلمة مرور جديدة.' : 'Incorrect username or password. Check the username exactly as shown in Users, or ask the system administrator to set a new password.';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return ar ? 'الحساب غير مفعّل في Supabase (البريد غير مؤكد). يرجى التواصل مع مدير النظام.' : 'Account not confirmed in Supabase. Contact the system administrator.';
  if (code === 'user_banned' || msg.includes('banned')) return ar ? 'الحساب محظور في Supabase. يرجى التواصل مع مدير النظام.' : 'Account is banned in Supabase. Contact the system administrator.';
  if (code === 'pgrst116' || msg.includes('0 rows') || msg.includes('no rows')) return ar ? 'تم التحقق من كلمة المرور، لكن الحساب غير مرتبط بملف صلاحيات في النظام. يرجى التواصل مع مدير النظام.' : 'Password is correct, but the account has no profile in the system. Contact the system administrator.';
  if (code === 'over_request_rate_limit' || msg.includes('rate limit') || msg.includes('too many')) return ar ? 'محاولات دخول كثيرة. انتظري دقائق ثم حاولي مرة أخرى.' : 'Too many sign-in attempts. Wait a few minutes and try again.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return ar ? 'تعذر الاتصال بالخادم. تأكدي من الإنترنت ثم حاولي مرة أخرى.' : 'Could not reach the server. Check the internet connection and try again.';
  return ar ? `تعذر تسجيل الدخول: ${error?.message || 'خطأ غير معروف'}` : `Sign-in failed: ${error?.message || 'Unknown error'}`;
}

export default function App() {
  const [lang, setLang] = useState('ar');
  const [profile, setProfile] = useState(null);
  const [authBusy, setAuthBusy] = useState(supabaseConfigured);
  const [databaseMode, setDatabaseMode] = useState(supabaseConfigured);
  const [showSplash, setShowSplash] = useState(true);
  const [active, setActive] = useState('dashboard');
  const [loginError, setLoginError] = useState('');
  useLanguageDomGuard(lang);

  useEffect(() => {
    let mounted = true;
    let authRefreshTimer;
    async function restoreSession() {
      if (!supabaseConfigured) {
        try {
          const saved = sessionStorage.getItem(PREVIEW_PROFILE_KEY);
          if (mounted && saved) setProfile(JSON.parse(saved));
        } catch {}
        if (mounted) setAuthBusy(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          const next = await getCurrentProfile();
          if (mounted) setProfile(next);
        }
      } catch (error) {
        console.error('Supabase session restore failed:', error);
      } finally {
        if (mounted) setAuthBusy(false);
      }
    }
    restoreSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !supabaseConfigured) return;
      clearTimeout(authRefreshTimer);
      if (!session) {
        setProfile(null);
        return;
      }
      // Auth callbacks run under the Auth client lock. Read the profile after
      // the callback returns so password updates cannot wait on that same lock.
      authRefreshTimer=setTimeout(async()=>{try {
        const next = await getCurrentProfile();
        if (mounted&&next?.id===session.user.id) setProfile(next);
      } catch (error) {
        console.error(error);
      }},0);
    });
    return () => {
      mounted = false;
      clearTimeout(authRefreshTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dataset.lang = lang;
    document.body.classList.toggle('language-en', lang === 'en');
    document.body.classList.toggle('language-ar', lang === 'ar');
    document.title = lang === 'ar'
      ? 'منظومة الأصول والسلف الذكية'
      : 'SAAMS Enterprise';
  }, [lang]);

  async function handlePreviewLogin(credentials) {
    setAuthBusy(true);
    setLoginError('');
    if (supabaseConfigured) {
      try {
        const nextProfile = await signInWithUsername(credentials.username, credentials.password);
        setProfile(nextProfile);
        setDatabaseMode(true);
      } catch (error) {
        setLoginError(loginErrorMessage(error, lang === 'ar'));
      } finally {
        setAuthBusy(false);
      }
      return;
    }

    const username = credentials.username.trim().toLowerCase();
    const user = loadUsers().find((item) => item.username.toLowerCase() === username && item.password === credentials.password);
    if (!user) {
      setLoginError(lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'Incorrect username or password.');
      setAuthBusy(false);
      return;
    }
    if (!user.active) {
      setLoginError(lang === 'ar' ? 'هذا الحساب موقوف. يرجى التواصل مع الإدارة.' : 'This account is disabled. Contact administration.');
      setAuthBusy(false);
      return;
    }
    const nextProfile = { ...user };
    setProfile(nextProfile);
    sessionStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify(nextProfile));
    setDatabaseMode(false);
    setAuthBusy(false);
  }

  function handleProfileUpdate(nextProfile) {
    setProfile(nextProfile);
    sessionStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify(nextProfile));
  }

  async function handleLogout() {
    if (supabaseConfigured) await signOut();
    sessionStorage.removeItem(PREVIEW_PROFILE_KEY);
    setProfile(null);
    setActive('dashboard');
  }

  if (showSplash) return <SplashScreen lang={lang} onDone={() => setShowSplash(false)} />;

  if (!profile) {
    return <Login lang={lang} setLang={setLang} onLogin={handlePreviewLogin} error={loginError} busy={authBusy} databaseMode={databaseMode} />;
  }

  const isNursery = profile?.role === 'nursery';
  const allAdminPages = ['dashboard', 'commandcenter', 'invoices', 'assets', 'transport', 'advances', 'reports', 'attachments', 'users', 'settings', 'help', 'about'];
  const allowedPages = isNursery
    ? ['dashboard', 'invoices', 'assets', 'advances', 'reports', 'attachments', 'settings', 'help', 'about']
    : profile?.role === 'super_admin'
      ? allAdminPages
      : allAdminPages.filter((page) => page === 'dashboard' || Boolean(profile?.permissions?.[page]));


  const pages = {
    dashboard: <Dashboard lang={lang} profile={profile} setActive={setActive} />,
    commandcenter: <ExecutiveCommandCenter lang={lang} profile={profile} setActive={setActive} />,
    invoices: <Invoices lang={lang} profile={profile} databaseMode={databaseMode} />,
    assets: <Assets lang={lang} profile={profile} />,
    transport: <TransportTasks lang={lang} profile={profile} />,
    advances: <Advances lang={lang} profile={profile} databaseMode={databaseMode} />,
    reports: <Reports lang={lang} profile={profile} />,
    attachments: <Attachments lang={lang} profile={profile} />,
    help: <Help lang={lang} setActive={setActive} />,
    about: <About lang={lang} />,
    users: <Users lang={lang} profile={profile} databaseMode={databaseMode} onProfileUpdate={handleProfileUpdate} />,
    settings: <Settings key={profile.id} lang={lang} profile={profile} onProfileUpdate={handleProfileUpdate} databaseMode={databaseMode} />,
  };

  return (
    <Layout
      lang={lang}
      setLang={setLang}
      profile={profile}
      onLogout={handleLogout}
      active={active}
      setActive={setActive}
      databaseMode={databaseMode}
    >
      {pages[allowedPages.includes(active) ? active : 'dashboard'] || pages.dashboard}
    </Layout>
  );
}
