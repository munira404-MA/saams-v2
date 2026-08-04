
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Assets from './pages/Assets';
import Advances from './pages/Advances';
import Reports from './pages/Reports';
import Users, { loadUsers } from './pages/Users';
import Settings from './pages/Settings';
import Layout from './components/Layout';

const PREVIEW_PROFILE_KEY = 'saams-preview-profile';

export default function App() {
  const [lang, setLang] = useState('ar');
  const [profile, setProfile] = useState(() => {
    try {
      const saved = sessionStorage.getItem(PREVIEW_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [active, setActive] = useState('dashboard');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  function handlePreviewLogin(credentials) {
    const username = credentials.username.trim().toLowerCase();
    const user = loadUsers().find((item) => item.username.toLowerCase() === username && item.password === credentials.password);
    if (!user) {
      setLoginError(lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'Incorrect username or password.');
      return;
    }
    if (!user.active) {
      setLoginError(lang === 'ar' ? 'هذا الحساب موقوف. يرجى التواصل مع الإدارة.' : 'This account is disabled. Contact administration.');
      return;
    }
    const nextProfile = { ...user };
    setLoginError('');
    setProfile(nextProfile);
    sessionStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify(nextProfile));
  }

  function handleLogout() {
    sessionStorage.removeItem(PREVIEW_PROFILE_KEY);
    setProfile(null);
    setActive('dashboard');
  }

  if (!profile) {
    return <Login lang={lang} setLang={setLang} onLogin={handlePreviewLogin} error={loginError} />;
  }

  const isNursery = profile?.role === 'nursery';
  const allowedPages = isNursery
    ? ['dashboard', 'invoices', 'assets', 'advances', 'reports']
    : profile?.role === 'super_admin'
      ? ['dashboard', 'invoices', 'assets', 'advances', 'reports', 'users', 'settings']
      : ['dashboard', 'invoices', 'assets', 'advances', 'reports'];


  const pages = {
    dashboard: <Dashboard lang={lang} profile={profile} setActive={setActive} />,
    invoices: <Invoices lang={lang} profile={profile} />,
    assets: <Assets lang={lang} profile={profile} />,
    advances: <Advances lang={lang} profile={profile} />,
    reports: <Reports lang={lang} profile={profile} />,
    users: <Users lang={lang} profile={profile} />,
    settings: <Settings lang={lang} profile={profile} />,
  };

  return (
    <Layout
      lang={lang}
      setLang={setLang}
      profile={profile}
      onLogout={handleLogout}
      active={active}
      setActive={setActive}
    >
      {pages[allowedPages.includes(active) ? active : 'dashboard'] || pages.dashboard}
    </Layout>
  );
}
