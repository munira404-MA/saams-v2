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

  const items = [
    'dashboard',
    'invoices',
    'assets',
    'advances',
    'reports',
    ...(profile?.role === 'super_admin' ? ['users', 'settings'] : []),
  ];

  return (
    <div className="app-shell dashboard-shell">
      <aside className="side-panel">
        <div className="side-logos">
          <img src="/nurseries-logo.png" alt="Sharjah Nurseries" />
          <span />
          <img src="/academy-logo.png" alt="Sharjah Education Academy" />
        </div>

        <div className="side-product">
          <strong>{ar ? 'منظومة الأصول والسلف الذكية' : 'Smart Assets & Advances'}</strong>
          <small>SAAMS v3.0</small>
        </div>

        <nav className="side-nav">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className={active === item ? 'active' : ''}
              onClick={() => setActive(item)}
            >
              <span className="nav-icon">{icons[item]}</span>
              <span>{labels[item]}</span>
            </button>
          ))}
        </nav>

        <button className="side-logout" type="button" onClick={onLogout}>
          <span>⇥</span>
          <span>{labels.logout}</span>
        </button>
      </aside>

      <div className="dashboard-stage">
        <header className="topbar">
          <div className="topbar-user">
            <div className="avatar">{(profile?.full_name || 'م').trim().charAt(0)}</div>
            <div>
              <strong>{profile?.full_name || (ar ? 'منيرة الأحمد' : 'Munira Alahmed')}</strong>
              <small>{labels.role}</small>
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
