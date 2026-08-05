import { useEffect, useState } from 'react';

const icons = {
  dashboard: '⌂',
  invoices: '▤',
  advances: '▥',
  assets: '◇',
  reports: '▥',
  users: '♙',
  settings: '⚙',
};

export default function Layout({
  lang,
  setLang,
  profile,
  onLogout,
  active,
  setActive,
  children,
}) {
  const ar = lang === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('resize', closeOnDesktop);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', closeOnDesktop);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-is-open', mobileMenuOpen);
    return () => document.body.classList.remove('mobile-menu-is-open');
  }, [mobileMenuOpen]);
  const labels = ar
    ? {
        dashboard: 'الرئيسية',
        invoices: 'الفواتير',
        advances: 'السلف',
        assets: 'الأصول',
        reports: 'التقارير',
        users: 'المستخدمون',
        settings: 'الإعدادات',
        logout: 'تسجيل الخروج',
        role: 'رئيس وحدة الأصول',
        notifications: 'الإشعارات',
      }
    : {
        dashboard: 'Dashboard',
        invoices: 'Invoices',
        advances: 'Advances',
        assets: 'Assets',
        reports: 'Reports',
        users: 'Users',
        settings: 'Settings',
        logout: 'Sign Out',
        role: 'Head of Assets Unit',
        notifications: 'Notifications',
      };

  const baseItems = ['dashboard', 'invoices', 'assets', 'advances', 'reports', 'users', 'settings'];
  const items = profile?.role === 'super_admin'
    ? baseItems
    : profile?.role === 'nursery'
      ? ['dashboard', 'invoices', 'assets', 'advances', 'reports', 'settings']
      : baseItems.filter((item) => item === 'dashboard' || Boolean(profile?.permissions?.[item]));

  return (
    <div className="app-shell dashboard-shell">
      <aside className={`side-panel ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="side-logos">
          <img src="/nurseries-logo.png" alt="Sharjah Nurseries" />
          <span />
          <img src="/academy-logo.png" alt="Sharjah Education Academy" />
        </div>

        <div className="side-product">
          <strong>{ar ? 'منظومة الأصول والسلف الذكية' : 'Smart Assets & Advances'}</strong>
          <small>SAAMS v6.3</small>
        </div>

        <nav className="side-nav">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className={active === item ? 'active' : ''}
              onClick={() => { setActive(item); setMobileMenuOpen(false); }}
            >
              <span className="nav-icon">{icons[item]}</span>
              <span>{labels[item]}</span>
            </button>
          ))}
        </nav>

        <button className="side-logout" type="button" onClick={() => { setMobileMenuOpen(false); onLogout(); }}>
          <span>⇥</span>
          <span>{labels.logout}</span>
        </button>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-menu-overlay"
          aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="dashboard-stage">
        <header className="topbar">
          <div className="topbar-user-wrap">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={ar ? 'فتح القائمة' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰
            </button>
            <div className="topbar-user">
            <div className="avatar">{(profile?.full_name || 'م').trim().charAt(0)}</div>
            <div>
              <strong>{profile?.full_name || (ar ? 'منيرة الأحمد' : 'Munira Alahmed')}</strong>
              <small>{profile?.role === 'nursery' ? (profile?.nursery || (ar ? 'حساب حضانة' : 'Nursery Account')) : profile?.role === 'admin' ? (ar ? 'موظف إدارة' : 'Administration Employee') : labels.role}</small>
            </div>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-button notification-button" type="button" aria-label={labels.notifications}>
              ♧
              <span className="notification-dot">4</span>
            </button>
            <button
              className="language-switch"
              type="button"
              onClick={() => setLang(ar ? 'en' : 'ar')}
            >
              ◎ {ar ? 'العربية' : 'English'}
              <b>{ar ? 'EN' : 'ع'}</b>
            </button>
          </div>
        </header>

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
