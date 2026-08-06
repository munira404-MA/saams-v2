import { useEffect, useState } from 'react';
import SmartAssistant from './SmartAssistant';
import { loadAuditLog } from '../utils/audit';

const icons = {
  dashboard: '⌂',  commandcenter: '◆',  invoices: '▤',
  assets: '◇',
  advances: '▥',
  reports: '▦',
  attachments: '▱',
  users: '♙',
  settings: '⚙',
  help: '?',
  about: 'ⓘ',
};

export default function Layout({
  lang,
  setLang,
  profile,
  onLogout,
  active,
  setActive,
  children,
  databaseMode,
}) {
  const ar = lang === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [auditRows, setAuditRows] = useState(loadAuditLog);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    home: true,
    management: ['invoices', 'assets', 'advances', 'reports', 'attachments'].includes(active),
    system: ['users', 'settings'].includes(active),
  });

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
    const refresh = () => setAuditRows(loadAuditLog());
    window.addEventListener('saams:audit-updated', refresh);
    return () => window.removeEventListener('saams:audit-updated', refresh);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-is-open', mobileMenuOpen);
    return () => document.body.classList.remove('mobile-menu-is-open');
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (['invoices', 'assets', 'advances', 'reports', 'attachments'].includes(active)) {
      setOpenGroups((current) => ({ ...current, management: true }));
    }
    if (['users', 'settings'].includes(active)) {
      setOpenGroups((current) => ({ ...current, system: true }));
    }
  }, [active]);

  const labels = ar
    ? {
        dashboard: 'الرئيسية',        commandcenter: 'مركز القيادة التنفيذي',        invoices: 'الفواتير',
        assets: 'الأصول',
        advances: 'السلف',
        reports: 'التقارير',
        attachments: 'مركز المرفقات',
        users: 'المستخدمون',
        settings: 'الإعدادات',
        help: 'المساعدة',
        about: 'حول المنظومة',
        homeGroup: 'الرئيسية',
        managementGroup: 'الإدارة',
        systemGroup: 'النظام',
        logout: 'تسجيل الخروج',
        role: 'رئيس وحدة الأصول',
        notifications: 'الإشعارات',
        online: 'متصل',
        lastLogin: 'آخر دخول: اليوم',
        collapse: 'طي القائمة',
        expand: 'فتح القائمة',
      }
    : {
        dashboard: 'Dashboard',        commandcenter: 'Executive Command Center',        invoices: 'Invoices',
        assets: 'Assets',
        advances: 'Advances',
        reports: 'Reports',
        attachments: 'Attachment Center',
        users: 'Users',
        settings: 'Settings',
        help: 'Help',
        about: 'About SAAMS',
        homeGroup: 'Home',
        managementGroup: 'Management',
        systemGroup: 'System',
        logout: 'Sign Out',
        role: 'Head of Assets Unit',
        notifications: 'Notifications',
        online: 'Online',
        lastLogin: 'Last login: Today',
        collapse: 'Collapse menu',
        expand: 'Expand menu',
      };

  const baseItems = [
    'dashboard',
    'commandcenter',
    'invoices',
    'assets',
    'advances',
    'reports',
    'attachments',
    'users',
    'settings',
    'help',
    'about',
  ];

  const items = profile?.role === 'super_admin'
    ? baseItems
    : profile?.role === 'nursery'
      ? ['dashboard', 'invoices', 'assets', 'advances', 'reports', 'attachments', 'settings', 'help', 'about']
      : baseItems.filter((item) => item === 'dashboard' || Boolean(profile?.permissions?.[item]));

  const groups = [
    {
      id: 'management',
      label: labels.managementGroup,
      icon: '▣',
      items: ['invoices', 'assets', 'advances', 'reports', 'attachments'].filter((item) => items.includes(item)),
    },
    {
      id: 'system',
      label: labels.systemGroup,
      icon: '⚙',
      items: ['users', 'settings'].filter((item) => items.includes(item)),
    },
  ].filter((group) => group.items.length);

  const goTo = (page) => {
    setActive(page);
    setMobileMenuOpen(false);
  };

  const toggleGroup = (groupId) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups((current) => ({ ...current, [groupId]: true }));
      return;
    }
    setOpenGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  return (
    <div className={`app-shell dashboard-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`side-panel organized-sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-collapse-button"
          title={collapsed ? labels.expand : labels.collapse}
          aria-label={collapsed ? labels.expand : labels.collapse}
          onClick={() => setCollapsed((value) => !value)}
        >
          ☰
        </button>

        <div className="side-logos">
          <img src="/nurseries-logo.png" alt="Sharjah Nurseries" />
          <span />
          <img src="/academy-logo.png" alt="Sharjah Education Academy" />
        </div>

        <div className="side-product bilingual-product">
          <strong>{ar ? 'منظومة الأصول والسلف الذكية' : 'SAAMS Enterprise'}</strong>
          <p>
            {ar
              ? 'نظام إدارة الأصول والسلف والعمليات المالية'
              : 'Assets, Advances & Financial Operations Management System'}
          </p>
          <small>{ar ? 'الإصدار 3.2' : 'Version 3.2'}</small>
        </div>

        <div className="sidebar-profile-card">
          <div className="sidebar-profile-avatar">
            {(profile?.full_name || 'م').trim().charAt(0)}
          </div>
          <div className="sidebar-profile-copy">
            <strong>{profile?.full_name || (ar ? 'منيرة الأحمد' : 'Munira Alahmed')}</strong>
            <small>
              {profile?.role === 'nursery'
                ? (profile?.nursery || (ar ? 'حساب حضانة' : 'Nursery Account'))
                : profile?.role === 'admin'
                  ? (ar ? 'موظف إدارة' : 'Administration Employee')
                  : labels.role}
            </small>
            <span><i /> {labels.online}</span>
          </div>
        </div>

        <nav className="side-nav organized-side-nav vertical-sidebar-nav">
          {items.includes('dashboard') && (
            <button
              type="button"
              className={`sidebar-standalone main-navigation-item ${active === 'dashboard' ? 'active' : ''}`}
              onClick={() => goTo('dashboard')}
              title={collapsed ? labels.dashboard : undefined}
            >
              <span className="nav-icon">{icons.dashboard}</span>
              <span>{labels.dashboard}</span>
            </button>
          )}

          {items.includes('commandcenter') && (
            <section className="sidebar-executive-section">
              {!collapsed && (
                <div className="sidebar-section-caption">
                  {ar ? 'الإدارة التنفيذية' : 'Executive Management'}
                </div>
              )}
              <button
                type="button"
                className={`sidebar-standalone executive-navigation-item executive-premium-link ${active === 'commandcenter' ? 'active' : ''}`}
                onClick={() => goTo('commandcenter')}
                title={collapsed ? labels.commandcenter : undefined}
              >
                <span className="nav-icon">♛</span>
                <span>{labels.commandcenter}</span>
              </button>
            </section>
          )}

          {groups.filter((group) => group.id === 'management').map((group) => {
            const groupActive = group.items.includes(active);
            const isOpen = openGroups[group.id];
            return (
              <section className={`sidebar-group ${groupActive ? 'has-active' : ''}`} key={group.id}>
                <button type="button" className={`sidebar-group-button ${groupActive ? 'active-group' : ''}`} onClick={() => toggleGroup(group.id)}>
                  <span className="nav-icon">{group.icon}</span>
                  <span className="sidebar-group-label">{group.label}</span>
                  <b className={`sidebar-chevron ${isOpen ? 'open' : ''}`}>⌄</b>
                </button>
                {isOpen && !collapsed && (
                  <div className="sidebar-submenu open">
                    {group.items.map((item) => (
                      <button key={item} type="button" className={`sidebar-subitem section-${item} ${active === item ? 'active' : ''}`} onClick={() => goTo(item)}>
                        <span className="nav-icon">{icons[item]}</span><span>{labels[item]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {groups.filter((group) => group.id === 'system').map((group) => {
            const groupActive = group.items.includes(active);
            const isOpen = openGroups[group.id];
            return (
              <section className={`sidebar-group ${groupActive ? 'has-active' : ''}`} key={group.id}>
                <button type="button" className={`sidebar-group-button ${groupActive ? 'active-group' : ''}`} onClick={() => toggleGroup(group.id)}>
                  <span className="nav-icon">{group.icon}</span>
                  <span className="sidebar-group-label">{group.label}</span>
                  <b className={`sidebar-chevron ${isOpen ? 'open' : ''}`}>⌄</b>
                </button>
                {isOpen && !collapsed && (
                  <div className="sidebar-submenu open">
                    {group.items.map((item) => (
                      <button key={item} type="button" className={`sidebar-subitem section-${item} ${active === item ? 'active' : ''}`} onClick={() => goTo(item)}>
                        <span className="nav-icon">{icons[item]}</span><span>{labels[item]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {items.includes('help') && (
            <button
              type="button"
              className={`sidebar-standalone help-navigation-item ${active === 'help' ? 'active' : ''}`}
              onClick={() => goTo('help')}
              title={collapsed ? labels.help : undefined}
            >
              <span className="nav-icon">{icons.help}</span>
              <span>{labels.help}</span>
            </button>
          )}
        </nav>

        <div className="sidebar-release-brand">
          <strong>SAAMS Enterprise</strong>
          <small>{ar ? 'الإصدار الرسمي 3.2.1' : 'Official Release 3.2.1'}</small>
        </div>

        <button
          className="side-logout"
          type="button"
          title={collapsed ? labels.logout : undefined}
          onClick={() => {
            setMobileMenuOpen(false);
            onLogout();
          }}
        >
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
                <small>
                  {profile?.role === 'nursery'
                    ? (profile?.nursery || (ar ? 'حساب حضانة' : 'Nursery Account'))
                    : profile?.role === 'admin'
                      ? (ar ? 'موظف إدارة' : 'Administration Employee')
                      : labels.role}
                </small>
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <span className={`topbar-database-status ${databaseMode ? 'connected' : 'preview'}`}>
              {databaseMode ? '● Supabase' : '◷ Preview'}
            </span>

            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                type="button"
                aria-label={labels.notifications}
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                ♧
                {auditRows.length > 0 && (
                  <span className="notification-dot">{Math.min(auditRows.length, 9)}</span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="notification-panel-head">
                    <strong>{labels.notifications}</strong>
                    <button onClick={() => setNotificationsOpen(false)}>×</button>
                  </div>

                  <div className="notification-panel-list">
                    {auditRows.slice(0, 7).map((row) => (
                      <button
                        key={row.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          setActive(
                            row.screen === 'الفواتير'
                              ? 'invoices'
                              : row.screen === 'الأصول'
                                ? 'assets'
                                : row.screen === 'السلف'
                                  ? 'advances'
                                  : 'settings'
                          );
                        }}
                      >
                        <span>•</span>
                        <div>
                          <strong>{row.action}</strong>
                          <small>{row.user} · {row.details || row.entityId}</small>
                        </div>
                        <time>{row.time}</time>
                      </button>
                    ))}
                    {!auditRows.length && (
                      <p>{ar ? 'لا توجد إشعارات جديدة.' : 'No new notifications.'}</p>
                    )}
                  </div>

                  <button
                    className="notification-view-all"
                    onClick={() => {
                      setNotificationsOpen(false);
                      setActive('settings');
                    }}
                  >
                    {ar ? 'عرض سجل العمليات' : 'View Audit Log'}
                  </button>
                </div>
              )}
            </div>

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

      <SmartAssistant
        lang={lang}
        profile={profile}
        onNavigate={(page) => {
          setActive(page);
          setMobileMenuOpen(false);
        }}
      />
    </div>
  );
}
