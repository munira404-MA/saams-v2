
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
import Layout from './components/Layout';
import { supabase, supabaseConfigured } from './supabase';
import { getCurrentProfile, signInWithUsername, signOut } from './data/supabaseData';

const PREVIEW_PROFILE_KEY = 'saams-preview-profile';

export default function App() {
  const [lang, setLang] = useState('ar');
  const [profile, setProfile] = useState(null);
  const [authBusy, setAuthBusy] = useState(supabaseConfigured);
  const [databaseMode, setDatabaseMode] = useState(supabaseConfigured);
  const [showSplash, setShowSplash] = useState(true);
  const [active, setActive] = useState('dashboard');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    let mounted = true;
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
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted || !supabaseConfigured) return;
      if (!session) {
        setProfile(null);
        return;
      }
      try {
        const next = await getCurrentProfile();
        if (mounted) setProfile(next);
      } catch (error) {
        console.error(error);
      }
    });
    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
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
        const message = error?.message === 'ACCOUNT_DISABLED'
          ? (lang === 'ar' ? 'هذا الحساب موقوف. يرجى التواصل مع الإدارة.' : 'This account is disabled.')
          : (lang === 'ar' ? 'تعذر تسجيل الدخول. تأكدي من إنشاء الحساب في Supabase ومن صحة البيانات.' : 'Sign-in failed. Verify the Supabase account and credentials.');
        setLoginError(message);
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
  const allAdminPages = ['dashboard', 'commandcenter', 'invoices', 'assets', 'advances', 'reports', 'attachments', 'users', 'settings', 'help', 'about'];
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
    advances: <Advances lang={lang} profile={profile} databaseMode={databaseMode} />,
    reports: <Reports lang={lang} profile={profile} />,
    attachments: <Attachments lang={lang} profile={profile} />,
    help: <Help lang={lang} setActive={setActive} />,
    about: <About lang={lang} />,
    users: <Users lang={lang} profile={profile} databaseMode={databaseMode} />,
    settings: <Settings lang={lang} profile={profile} onProfileUpdate={handleProfileUpdate} />,
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
