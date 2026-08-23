import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { actionTone, loadAuditLog, recordAudit, saveAuditLog } from '../utils/audit';
import { DEFAULT_USERS, loadUsers, USERS_STORAGE_KEY } from './Users';

const NURSERIES_KEY = 'saams-settings-nurseries-v2-official-36';
const SETTINGS_KEY = 'saams-system-settings-v1';
const PRODUCTION_KEY = 'saams-production-readiness-v2-official-36';

const DEFAULT_NURSERIES = [
  'الرحمانية الجديدة',
  'مركز اللؤلؤية للطفولة المبكرة',
  'مركز السيوح للطفولة المبكرة',
  'واسط 2',
  'مركز الرحمانية للطفولة المبكرة',
  'البديع',
  'اللية',
  'القليعة',
  'مركز البستان للطفولة المبكرة',
  'مركز كلباء للطفولة المبكرة',
  'الغيل',
  'الطيبة',
  'الحرس الأميري',
  'الحمرية',
  'المدينة الباسمة',
  'الشرطي الصغير',
  'الثميد',
  'سهيلة',
  'سهيلة الجديدة',
  'البرير',
  'مليحة',
  'القادسية',
  'دبا الحصن',
  'السياقة',
  'الشارقة النموذجية',
  'مغيدر',
  'الشيماء',
  'المستقبل',
  'غرفتي الصغيرة',
  'جميلة',
  'الباحثة',
  'النحوة',
  'جامعة خورفكان',
  'جامعة كلباء',
  'وادي الحلو',
  'شيص'
].map((name, index) => ({ id: `NUR-${String(index + 1).padStart(3, '0')}`, name, manager: '', active: true }));

const DEFAULT_SETTINGS = {
  invoice: {
    aiEnabled: true,
    requireTrn: true,
    requirePaymentMethod: true,
    rejectBlurred: true,
    rejectCoveredReceipt: true,
    rejectMultipleInvoices: true,
    allowManualReview: true,
  },
  advanceTypes: [
    { id: 'ADV-T-1', nameAr: 'سلفة شهرية', nameEn: 'Monthly Advance', active: true },
    { id: 'ADV-T-2', nameAr: 'سلفة فعاليات', nameEn: 'Event Advance', active: true },
    { id: 'ADV-T-3', nameAr: 'سلفة طارئة', nameEn: 'Emergency Advance', active: false },
  ],
  notifications: {
    invoiceUploaded: true,
    invoiceApproved: true,
    invoiceReturned: true,
    assetTransfer: true,
    assetDisposal: true,
    advanceLowBalance: true,
    assetAdded: false,
  },
  profile: {
    titleAr: 'رئيس وحدة الأصول',
    titleEn: 'Head of Assets Unit',
    email: 'munira404@gmail.com',
  },
};

const DEFAULT_PRODUCTION = {
  launchMonth: '2026-08',
  phase: 'pilot',
  pilotNurseries: ['الرحمانية الجديدة', 'القليعة', 'واسط 2'],
  rows: DEFAULT_NURSERIES.map((nursery) => ({
    nurseryId: nursery.id,
    nursery: nursery.name,
    openingBalance: 0,
    accountReady: false,
    trained: false,
    dataReady: false,
    approved: false,
    notes: '',
  })),
};

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


const labels = {
  ar: {
    title: 'الإعدادات',
    subtitle: 'مركز التحكم بإعدادات النظام والحضانات والتنبيهات والنسخ الاحتياطي.',
    production: 'التشغيل الفعلي',
    profile: 'الحساب الشخصي',
    users: 'إدارة المستخدمين',
    nurseries: 'إدارة الحضانات',
    invoices: 'الفواتير والذكاء الاصطناعي',
    advances: 'إعدادات السلف',
    notifications: 'التنبيهات',
    backup: 'النسخ الاحتياطي',
    audit: 'سجل العمليات',
    info: 'معلومات النظام',
    saveAll: 'حفظ جميع الإعدادات',
    reset: 'استعادة الافتراضي',
    saved: 'تم حفظ التغييرات بنجاح.',
  },
  en: {
    title: 'Settings',
    subtitle: 'Control system settings, nurseries, notifications, and backups.',
    production: 'Production Launch',
    profile: 'Personal Profile',
    users: 'User Management',
    nurseries: 'Nursery Management',
    invoices: 'Invoices & AI',
    advances: 'Advance Settings',
    notifications: 'Notifications',
    backup: 'Backup',
    audit: 'Audit Log',
    info: 'System Information',
    saveAll: 'Save All Settings',
    reset: 'Restore Defaults',
    saved: 'Settings saved successfully.',
  }
};

const NAV_ICONS = {
  production: '✓',
  profile: '◉',
  users: '♙',
  nurseries: '⌂',
  invoices: '▤',
  advances: '▣',
  notifications: '♧',
  backup: '⇩',
  audit: '◷',
  info: 'ⓘ',
};

function Switch({ checked, onChange, label, description }) {
  return (
    <label className="settings-switch-row">
      <div>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="settings-switch-ui" />
    </label>
  );
}

export default function Settings({ lang, profile, onProfileUpdate, databaseMode = false }) {
  const ar = lang === 'ar';
  const t = labels[lang] || labels.ar;
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(() => readJson(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [production, setProduction] = useState(() => readJson(PRODUCTION_KEY, DEFAULT_PRODUCTION));
  const [nurseries, setNurseries] = useState(() => readJson(NURSERIES_KEY, DEFAULT_NURSERIES));
  const [users, setUsers] = useState(loadUsers);
  const [audit, setAudit] = useState(() => {
    const existing = loadAuditLog();
    if (existing.length) return existing;
    return [
      { id:'L1', createdAt:'2026-08-05T08:15:00.000Z', date:'05/08/2026', time:'12:15 م', user:'منيرة الأحمد', organization:'الإدارة', nursery:'', screen:'تسجيل الدخول', action:'تسجيل دخول', actionType:'login', entityType:'session', entityId:'', details:'دخول مدير النظام', reason:'' },
      { id:'L2', createdAt:'2026-08-05T07:42:00.000Z', date:'05/08/2026', time:'11:42 ص', user:'حضانة القليعة', organization:'حضانة القليعة', nursery:'القليعة', screen:'الفواتير', action:'رفع فاتورة', actionType:'create', entityType:'invoice', entityId:'INV-2026-00134', details:'مكتبة دبي للتوزيع — 315.00 AED', reason:'' },
      { id:'L3', createdAt:'2026-08-05T06:18:00.000Z', date:'05/08/2026', time:'10:18 ص', user:'منيرة الأحمد', organization:'الإدارة', nursery:'واسط 2', screen:'الأصول', action:'اعتماد طلب أصل', actionType:'approve', entityType:'asset_request', entityId:'AST-REQ-026', details:'خزانة تخزين خشبية — SEA-000427', reason:'' },
    ];
  });
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [auditFilters, setAuditFilters] = useState({ from:'', to:'', user:'all', nursery:'all', screen:'all', action:'all' });
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [nurseryModal, setNurseryModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [serverStatus, setServerStatus] = useState({ loading: true, serverReachable: false, supabaseServerUrl: false, supabaseAnonKey: false, supabaseServiceRoleKey: false, accountManagementReady: false });
  const restoreRef = useRef(null);

  useEffect(() => {
    const refresh = () => setAudit(loadAuditLog());
    window.addEventListener('saams:audit-updated', refresh);
    return () => window.removeEventListener('saams:audit-updated', refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkServerStatus() {
      try {
        const response = await fetch('/api/system-status', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!cancelled) setServerStatus({ loading: false, serverReachable: response.ok, ...data });
      } catch {
        if (!cancelled) setServerStatus({ loading: false, serverReachable: false, supabaseServerUrl: false, supabaseAnonKey: false, supabaseServiceRoleKey: false, accountManagementReady: false });
      }
    }
    checkServerStatus();
    return () => { cancelled = true; };
  }, []);

  const isSuperAdmin = profile?.role === 'super_admin';

  const navItems = [
    ['profile', t.profile],
    ...(isSuperAdmin ? [
      ['production', t.production],
      ['users', t.users],
      ['nurseries', t.nurseries],
      ['invoices', t.invoices],
      ['advances', t.advances],
      ['notifications', t.notifications],
      ['backup', t.backup],
      ['audit', t.audit],
      ['info', t.info],
    ] : []),
  ];

  function persistAll(showMessage = true) {
    let nextUsers = users;
    let nextProfile = profile;
    if (newPassword.trim()) {
      nextUsers = users.map((user) => user.id === profile?.id ? { ...user, password: newPassword.trim() } : user);
      nextProfile = { ...profile, password: newPassword.trim() };
      setUsers(nextUsers);
      setNewPassword('');
      onProfileUpdate?.(nextProfile);
    }
    writeJson(SETTINGS_KEY, settings);
    writeJson(PRODUCTION_KEY, production);
    writeJson(NURSERIES_KEY, nurseries);
    writeJson(USERS_STORAGE_KEY, nextUsers);
    recordAudit({profile,screen:'الإعدادات',action:'تحديث الإعدادات',actionType:'update',entityType:'settings',details:'تم حفظ إعدادات النظام'});
    setAudit(loadAuditLog());
    if (showMessage) {
      setMessage(t.saved);
      window.setTimeout(() => setMessage(''), 2600);
    }
  }

  function resetDefaults() {
    const ok = window.confirm(ar ? 'هل تريدين استعادة الإعدادات الافتراضية؟' : 'Restore default settings?');
    if (!ok) return;
    setSettings(DEFAULT_SETTINGS);
    setProduction(DEFAULT_PRODUCTION);
    setNurseries(DEFAULT_NURSERIES);
    setMessage(ar ? 'تمت استعادة الإعدادات الافتراضية. اضغطي حفظ لتثبيتها.' : 'Defaults restored. Save to apply.');
  }

  function downloadBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: 'SAAMS Official 3.2',
      settings,
      production,
      nurseries,
      users,
      audit,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAAMS_Backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    recordAudit({profile,screen:'الإعدادات',action:'تنزيل نسخة احتياطية',actionType:'export',entityType:'backup',details:'تم تنزيل نسخة JSON'});
    setAudit(loadAuditLog());
  }

  async function restoreBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.settings || !Array.isArray(parsed.nurseries) || !Array.isArray(parsed.users)) throw new Error('invalid');
      setSettings(parsed.settings);
      if (parsed.production) { setProduction(parsed.production); writeJson(PRODUCTION_KEY, parsed.production); }
      setNurseries(parsed.nurseries);
      setUsers(parsed.users);
      setAudit(Array.isArray(parsed.audit) ? parsed.audit : audit);
      writeJson(SETTINGS_KEY, parsed.settings);
      writeJson(NURSERIES_KEY, parsed.nurseries);
      writeJson(USERS_STORAGE_KEY, parsed.users);
      if (Array.isArray(parsed.audit)) saveAuditLog(parsed.audit);
      setMessage(ar ? 'تم استرجاع النسخة الاحتياطية.' : 'Backup restored.');
    } catch {
      alert(ar ? 'ملف النسخة الاحتياطية غير صالح.' : 'Invalid backup file.');
    } finally {
      if (restoreRef.current) restoreRef.current.value = '';
    }
  }

  function saveNursery(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const manager = String(form.get('manager') || '').trim();
    if (!name) return;
    if (nurseryModal?.id) {
      setNurseries((current) => current.map((n) => n.id === nurseryModal.id ? { ...n, name, manager } : n));
    } else {
      setNurseries((current) => [...current, { id:`NUR-${Date.now()}`, name, manager, active:true }]);
    }
    setNurseryModal(null);
  }

  function addAdvanceType() {
    if (!typeName.trim()) return;
    setSettings((current) => ({
      ...current,
      advanceTypes: [...current.advanceTypes, {
        id: `ADV-T-${Date.now()}`,
        nameAr: typeName.trim(),
        nameEn: typeName.trim(),
        active: true,
      }],
    }));
    setTypeName('');
  }

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audit.filter((item) => {
      const created = item.createdAt ? new Date(item.createdAt) : null;
      const fromOk = !auditFilters.from || (created && created >= new Date(`${auditFilters.from}T00:00:00`));
      const toOk = !auditFilters.to || (created && created <= new Date(`${auditFilters.to}T23:59:59`));
      const userOk = auditFilters.user === 'all' || item.user === auditFilters.user;
      const nurseryOk = auditFilters.nursery === 'all' || item.nursery === auditFilters.nursery;
      const screenOk = auditFilters.screen === 'all' || item.screen === auditFilters.screen;
      const actionOk = auditFilters.action === 'all' || item.actionType === auditFilters.action;
      const textOk = !q || [item.user,item.organization,item.nursery,item.screen,item.action,item.details,item.reason,item.entityId].join(' ').toLowerCase().includes(q);
      return fromOk && toOk && userOk && nurseryOk && screenOk && actionOk && textOk;
    });
  }, [audit, search, auditFilters]);

  const auditOptions = useMemo(() => ({
    users: [...new Set(audit.map(x => x.user).filter(Boolean))],
    nurseries: [...new Set(audit.map(x => x.nursery).filter(Boolean))],
    screens: [...new Set(audit.map(x => x.screen).filter(Boolean))],
  }), [audit]);

  function exportAuditExcel() {
    const rows = filteredLogs.map(item => ({
      'التاريخ': item.date,
      'الوقت': item.time,
      'المستخدم': item.user,
      'الجهة': item.organization,
      'الحضانة': item.nursery,
      'الشاشة': item.screen,
      'العملية': item.action,
      'الرقم المرجعي': item.entityId,
      'التفاصيل': item.details,
      'السبب': item.reason,
    }));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [12,10,20,18,18,16,20,20,35,35].map(wch => ({wch}));
    XLSX.utils.book_append_sheet(workbook, sheet, 'سجل العمليات');
    XLSX.writeFile(workbook, `SAAMS_Audit_Log_${new Date().toISOString().slice(0,10)}.xlsx`);
    recordAudit({profile,screen:'الإعدادات',action:'تصدير سجل العمليات',actionType:'export',entityType:'audit_log',details:`${rows.length} عملية`});
  }

  const productionRows = useMemo(() => {
    const saved = Array.isArray(production.rows) ? production.rows : [];
    return nurseries.map((nursery) => {
      const row = saved.find((item) => item.nurseryId === nursery.id || item.nursery === nursery.name);
      return row || { nurseryId:nursery.id, nursery:nursery.name, openingBalance:0, accountReady:false, trained:false, dataReady:false, approved:false, notes:'' };
    });
  }, [production.rows, nurseries]);

  const readinessScore = (row) => [row.accountReady,row.trained,row.dataReady,row.approved].filter(Boolean).length;
  const readyCount = productionRows.filter((row) => readinessScore(row) === 4).length;
  const readinessPercent = productionRows.length ? Math.round(productionRows.reduce((sum,row)=>sum+readinessScore(row),0)/(productionRows.length*4)*100) : 0;
  const updateProductionRow = (nurseryId, patch) => setProduction((current) => ({
    ...current,
    rows: productionRows.map((row) => row.nurseryId === nurseryId ? {...row,...patch} : row),
  }));
  const togglePilotNursery = (name) => setProduction((current) => ({
    ...current,
    pilotNurseries: current.pilotNurseries?.includes(name)
      ? current.pilotNurseries.filter((item)=>item!==name)
      : [...(current.pilotNurseries||[]), name],
  }));

  const systemStats = [
    [ar ? 'الإصدار' : 'Version', 'SAAMS Official 3.2'],
    [ar ? 'الحضانات' : 'Nurseries', nurseries.length],
    [ar ? 'المستخدمون' : 'Users', users.length],
    [ar ? 'الحسابات النشطة' : 'Active Accounts', users.filter((u) => u.active).length],
    [ar ? 'خدمة الذكاء الاصطناعي' : 'AI Service', settings.invoice.aiEnabled ? (ar ? 'متصلة' : 'Connected') : (ar ? 'متوقفة' : 'Disabled')],
    [ar ? 'آخر تحديث' : 'Last Update', '05/08/2026'],
  ];

  return (
    <section className="settings-page">
      <header className="settings-heading">
        <div>
          <span className="eyebrow">SAAMS Official 3.2</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="settings-header-actions">
          <button className="secondary-action" type="button" onClick={resetDefaults}>↺ {t.reset}</button>
          <button className="primary-action" type="button" onClick={() => persistAll(true)}>✓ {t.saveAll}</button>
        </div>
      </header>

      {message && <div className="settings-toast">✓ {message}</div>}

      <div className="settings-layout">
        <aside className="settings-nav">
          {navItems.map(([key, label]) => (
            <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>
              <span>{NAV_ICONS[key]}</span><strong>{label}</strong><b>‹</b>
            </button>
          ))}
        </aside>

        <div className="settings-content">
          {activeTab === 'production' && (
            <article className="settings-card production-launch-card">
              <div className="settings-section-title">
                <span className="settings-section-icon">✓</span>
                <div><h2>{t.production}</h2><p>{ar ? 'تجهيز الحضانات والحسابات والأرصدة قبل التعميم الرسمي.' : 'Prepare nurseries, accounts, balances, and training before rollout.'}</p></div>
              </div>

              <div className="production-summary-grid">
                <div><small>{ar?'نسبة الجاهزية':'Readiness'}</small><strong>{readinessPercent}%</strong><span><i style={{width:`${readinessPercent}%`}} /></span></div>
                <div><small>{ar?'الحضانات الجاهزة':'Ready Nurseries'}</small><strong>{readyCount} / {productionRows.length}</strong></div>
                <div><small>{ar?'المرحلة الحالية':'Current Phase'}</small><strong>{production.phase==='pilot'?(ar?'تشغيل تجريبي':'Pilot'):(ar?'تعميم رسمي':'Full Rollout')}</strong></div>
                <div><small>{ar?'شهر بداية التشغيل':'Launch Month'}</small><strong>{production.launchMonth || '—'}</strong></div>
              </div>

              <div className="production-control-grid">
                <label><span>{ar?'شهر بداية التشغيل':'Launch Month'}</span><input type="month" value={production.launchMonth||''} onChange={(e)=>setProduction({...production,launchMonth:e.target.value})}/></label>
                <label><span>{ar?'مرحلة التشغيل':'Launch Phase'}</span><select value={production.phase||'pilot'} onChange={(e)=>setProduction({...production,phase:e.target.value})}><option value="pilot">{ar?'تشغيل تجريبي محدود':'Limited Pilot'}</option><option value="full">{ar?'تعميم رسمي':'Full Rollout'}</option></select></label>
              </div>

              <div className="pilot-nurseries-box">
                <div><strong>{ar?'الحضانات التجريبية':'Pilot Nurseries'}</strong><small>{ar?'اختاري الحضانات التي ستبدأ أولاً قبل التعميم.':'Select the first nurseries to start before rollout.'}</small></div>
                <div className="pilot-nursery-chips">{nurseries.filter(n=>n.active).map((n)=><button type="button" key={n.id} className={production.pilotNurseries?.includes(n.name)?'selected':''} onClick={()=>togglePilotNursery(n.name)}>{production.pilotNurseries?.includes(n.name)?'✓ ':''}{n.name}</button>)}</div>
              </div>

              <div className="settings-table-wrap production-table-wrap">
                <table className="settings-table production-readiness-table">
                  <thead><tr><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'الرصيد الافتتاحي':'Opening Balance'}</th><th>{ar?'الحساب':'Account'}</th><th>{ar?'التدريب':'Training'}</th><th>{ar?'البيانات':'Data'}</th><th>{ar?'اعتماد الجاهزية':'Approval'}</th><th>{ar?'الحالة':'Status'}</th><th>{ar?'ملاحظات':'Notes'}</th></tr></thead>
                  <tbody>{productionRows.map((row)=>{const score=readinessScore(row);return <tr key={row.nurseryId} className={production.pilotNurseries?.includes(row.nursery)?'pilot-row':''}>
                    <td><strong>{row.nursery}</strong>{production.pilotNurseries?.includes(row.nursery)&&<small className="pilot-badge">{ar?'تجريبي':'Pilot'}</small>}</td>
                    <td><input className="production-balance-input" type="number" min="0" step="0.01" value={row.openingBalance} onChange={(e)=>updateProductionRow(row.nurseryId,{openingBalance:Number(e.target.value)})}/></td>
                    {['accountReady','trained','dataReady','approved'].map((field)=><td key={field}><label className="production-check"><input type="checkbox" checked={Boolean(row[field])} onChange={(e)=>updateProductionRow(row.nurseryId,{[field]:e.target.checked})}/><span>✓</span></label></td>)}
                    <td><span className={`readiness-status score-${score}`}>{score===4?(ar?'جاهزة':'Ready'):`${score}/4`}</span></td>
                    <td><input className="production-note-input" value={row.notes||''} onChange={(e)=>updateProductionRow(row.nurseryId,{notes:e.target.value})} placeholder={ar?'ملاحظة...':'Note...'}/></td>
                  </tr>})}</tbody>
                </table>
              </div>
              <div className="production-actions-bar"><p>{ar?'يتم حفظ جميع بيانات الجاهزية عند الضغط على «حفظ جميع الإعدادات».':'Readiness data is saved with Save All Settings.'}</p><button type="button" className="primary-action" onClick={()=>persistAll(true)}>✓ {ar?'حفظ خطة التشغيل':'Save Launch Plan'}</button></div>
            </article>
          )}

          {activeTab === 'profile' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">◉</span><div><h2>{t.profile}</h2><p>{ar ? 'بيانات الحساب المستخدم حاليًا.' : 'Current account information.'}</p></div></div>
              <div className="profile-settings-grid">
                <div className="profile-avatar-large">{(profile?.full_name || 'م').charAt(0)}</div>
                <div className="settings-form-grid">
                  <label><span>{ar ? 'الاسم' : 'Name'}</span><input value={profile?.full_name || ''} readOnly /></label>
                  <label><span>{ar ? 'اسم المستخدم' : 'Username'}</span><input value={profile?.username || ''} readOnly /></label>
                  <label><span>{ar ? 'المسمى الوظيفي' : 'Job Title'}</span><input value={ar ? settings.profile.titleAr : settings.profile.titleEn} onChange={(e) => setSettings({...settings, profile:{...settings.profile, [ar?'titleAr':'titleEn']:e.target.value}})} /></label>
                  <label><span>{ar ? 'البريد الإلكتروني' : 'Email'}</span><input type="email" value={settings.profile.email} onChange={(e) => setSettings({...settings, profile:{...settings.profile, email:e.target.value}})} /></label>
                  <label className="settings-wide">
                    <span>{ar ? 'كلمة المرور الحالية' : 'Current Password'}</span>
                    <div className="settings-password-input">
                      <input type={showCurrentPassword ? 'text' : 'password'} value={profile?.password || ''} readOnly />
                      <button type="button" onClick={() => setShowCurrentPassword((value) => !value)}>{showCurrentPassword ? '◉' : '◎'}</button>
                    </div>
                  </label>
                  <label className="settings-wide"><span>{ar ? 'تغيير كلمة المرور' : 'Change Password'}</span><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={ar ? 'اكتبي كلمة المرور الجديدة ثم اضغطي حفظ' : 'Enter a new password, then save'} /></label>
                </div>
              </div>
            </article>
          )}

          {activeTab === 'users' && (
            <article className="settings-card">
              <div className="settings-section-title">
                <span className="settings-section-icon">♙</span>
                <div><h2>{t.users}</h2><p>{ar ? 'الإضافة والتعديل الكامل متاحان من شاشة المستخدمين.' : 'Full management is available from the Users screen.'}</p></div>
              </div>
              <div className="settings-summary-grid">
                <div><small>{ar?'إجمالي المستخدمين':'Total Users'}</small><strong>{users.length}</strong></div>
                <div><small>{ar?'الحسابات النشطة':'Active Accounts'}</small><strong>{users.filter(u=>u.active).length}</strong></div>
                <div><small>{ar?'حسابات الحضانات':'Nursery Accounts'}</small><strong>{users.filter(u=>u.role==='nursery').length}</strong></div>
              </div>
              <div className="settings-table-wrap">
                <table className="settings-table">
                  <thead><tr><th>{ar?'الاسم':'Name'}</th><th>{ar?'اسم المستخدم':'Username'}</th><th>{ar?'الصلاحية':'Role'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead>
                  <tbody>{users.slice(0,8).map((u)=><tr key={u.id}><td>{u.full_name}</td><td>{u.username}</td><td>{u.role==='super_admin'?(ar?'مدير النظام':'System Admin'):u.role==='nursery'?(ar?'حضانة':'Nursery'):(ar?'موظف إدارة':'Administration')}</td><td>{u.nursery||'—'}</td><td><span className={`settings-status ${u.active?'active':'inactive'}`}>{u.active?(ar?'نشط':'Active'):(ar?'موقوف':'Disabled')}</span></td></tr>)}</tbody>
                </table>
              </div>
              <p className="settings-note">{ar?'لإضافة مستخدم أو تعديل كلمة المرور استخدمي شاشة «المستخدمون» من القائمة الرئيسية.':'Use the Users screen to add accounts or reset passwords.'}</p>
            </article>
          )}

          {activeTab === 'nurseries' && (
            <article className="settings-card">
              <div className="settings-section-title settings-title-with-action">
                <div className="settings-title-group"><span className="settings-section-icon">⌂</span><div><h2>{t.nurseries}</h2><p>{ar ? 'إضافة الحضانات وتفعيلها أو إيقافها.' : 'Add, activate, or disable nurseries.'}</p></div></div>
                <button className="primary-action" type="button" onClick={() => setNurseryModal({})}>＋ {ar?'إضافة حضانة':'Add Nursery'}</button>
              </div>
              <div className="settings-table-wrap">
                <table className="settings-table">
                  <thead><tr><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'المدير/المسؤول':'Manager'}</th><th>{ar?'الحالة':'Status'}</th><th>{ar?'الإجراءات':'Actions'}</th></tr></thead>
                  <tbody>{nurseries.map((n)=><tr key={n.id}><td><strong>{n.name}</strong></td><td>{n.manager||'—'}</td><td><span className={`settings-status ${n.active?'active':'inactive'}`}>{n.active?(ar?'مفعلة':'Active'):(ar?'موقوفة':'Disabled')}</span></td><td><div className="settings-row-actions"><button onClick={()=>setNurseryModal(n)}>{ar?'تعديل':'Edit'}</button><button onClick={()=>setNurseries(current=>current.map(x=>x.id===n.id?{...x,active:!x.active}:x))}>{n.active?(ar?'إيقاف':'Disable'):(ar?'تفعيل':'Enable')}</button></div></td></tr>)}</tbody>
                </table>
              </div>
            </article>
          )}

          {activeTab === 'invoices' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">▤</span><div><h2>{t.invoices}</h2><p>{ar ? 'قواعد قراءة الفواتير والتحقق منها.' : 'Invoice reading and validation rules.'}</p></div></div>
              <div className="settings-switches">
                <Switch checked={settings.invoice.aiEnabled} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,aiEnabled:v}})} label={ar?'تشغيل قراءة الذكاء الاصطناعي':'Enable AI invoice reading'} />
                <Switch checked={settings.invoice.requireTrn} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,requireTrn:v}})} label={ar?'إلزام الرقم الضريبي للفواتير الضريبية':'Require TRN for tax invoices'} />
                <Switch checked={settings.invoice.requirePaymentMethod} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,requirePaymentMethod:v}})} label={ar?'إلزام طريقة الدفع':'Require payment method'} />
                <Switch checked={settings.invoice.rejectBlurred} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,rejectBlurred:v}})} label={ar?'رفض الصور غير الواضحة':'Reject unclear images'} />
                <Switch checked={settings.invoice.rejectCoveredReceipt} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,rejectCoveredReceipt:v}})} label={ar?'رفض إيصال يغطي الفاتورة':'Reject receipt covering invoice'} />
                <Switch checked={settings.invoice.rejectMultipleInvoices} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,rejectMultipleInvoices:v}})} label={ar?'رفض أكثر من فاتورة في صفحة واحدة':'Reject multiple invoices on one page'} />
                <Switch checked={settings.invoice.allowManualReview} onChange={(v)=>setSettings({...settings,invoice:{...settings.invoice,allowManualReview:v}})} label={ar?'السماح بالمراجعة اليدوية':'Allow manual review'} />
              </div>
              <div className="secure-key-card">
                <div><small>OpenAI API</small><strong>OPENAI_API_KEY</strong><p>{ar?'المفتاح محفوظ بأمان في Vercel ولا يظهر داخل المتصفح.':'The key is securely stored in Vercel and is never exposed in the browser.'}</p></div>
                <span className={settings.invoice.aiEnabled?'connected':'disabled'}>{settings.invoice.aiEnabled?(ar?'متصل':'Connected'):(ar?'متوقف':'Disabled')}</span>
              </div>
            </article>
          )}

          {activeTab === 'advances' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">▣</span><div><h2>{t.advances}</h2><p>{ar ? 'إدارة أنواع السلف المتاحة.' : 'Manage available advance types.'}</p></div></div>
              <div className="advance-type-add"><input value={typeName} onChange={(e)=>setTypeName(e.target.value)} placeholder={ar?'اسم نوع السلفة الجديد':'New advance type'} /><button className="primary-action" onClick={addAdvanceType}>＋ {ar?'إضافة':'Add'}</button></div>
              <div className="advance-types-list">{settings.advanceTypes.map((type)=><div key={type.id}><strong>{ar?type.nameAr:type.nameEn}</strong><Switch checked={type.active} onChange={(v)=>setSettings({...settings,advanceTypes:settings.advanceTypes.map(x=>x.id===type.id?{...x,active:v}:x)})} label={type.active?(ar?'مفعلة':'Enabled'):(ar?'موقوفة':'Disabled')} /></div>)}</div>
            </article>
          )}

          {activeTab === 'notifications' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">♧</span><div><h2>{t.notifications}</h2><p>{ar ? 'اختاري الأحداث التي ترسل تنبيهًا داخل النظام.' : 'Choose events that generate system notifications.'}</p></div></div>
              <div className="settings-switches">
                {[
                  ['invoiceUploaded',ar?'عند رفع فاتورة جديدة':'New invoice uploaded'],
                  ['invoiceApproved',ar?'عند اعتماد فاتورة':'Invoice approved'],
                  ['invoiceReturned',ar?'عند إرجاع فاتورة':'Invoice returned'],
                  ['assetTransfer',ar?'عند تقديم طلب نقل أصل':'Asset transfer request'],
                  ['assetDisposal',ar?'عند تقديم طلب إسقاط أصل':'Asset disposal request'],
                  ['advanceLowBalance',ar?'عند قرب انتهاء رصيد السلفة':'Advance balance running low'],
                  ['assetAdded',ar?'عند إضافة أصل جديد':'New asset added'],
                ].map(([key,label])=><Switch key={key} checked={settings.notifications[key]} onChange={(v)=>setSettings({...settings,notifications:{...settings.notifications,[key]:v}})} label={label} />)}
              </div>
            </article>
          )}

          {activeTab === 'backup' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">⇩</span><div><h2>{t.backup}</h2><p>{ar ? 'تنزيل أو استرجاع نسخة من إعدادات نسخة المعاينة.' : 'Download or restore preview settings.'}</p></div></div>
              <div className="backup-grid">
                <button className="backup-action download" onClick={downloadBackup}><span>⇩</span><strong>{ar?'تنزيل نسخة احتياطية':'Download Backup'}</strong><small>JSON</small></button>
                <label className="backup-action restore"><input ref={restoreRef} type="file" accept=".json,application/json" onChange={(e)=>restoreBackup(e.target.files?.[0])}/><span>⇧</span><strong>{ar?'استرجاع نسخة احتياطية':'Restore Backup'}</strong><small>{ar?'اختيار ملف JSON':'Choose JSON file'}</small></label>
              </div>
              <div className="backup-warning">{ar?'ملاحظة: هذه النسخة تحفظ إعدادات المعاينة المحلية فقط. عند الربط النهائي ستُحفظ النسخ من قاعدة البيانات.':'Note: This backup contains local preview settings only.'}</div>
            </article>
          )}

          {activeTab === 'audit' && (
            <article className="settings-card audit-enterprise-card">
              <div className="settings-section-title settings-title-with-action">
                <div className="settings-title-group"><span className="settings-section-icon">◷</span><div><h2>{t.audit}</h2><p>{ar ? 'سجل تدقيق كامل لكل العمليات المنفذة في النظام.' : 'Complete audit trail for system actions.'}</p></div></div>
                <button className="secondary-action" type="button" onClick={exportAuditExcel}>⇩ {ar?'تصدير Excel':'Export Excel'}</button>
              </div>

              <div className="audit-summary-grid">
                <div><small>{ar?'إجمالي العمليات':'Total Actions'}</small><strong>{audit.length}</strong></div>
                <div><small>{ar?'اعتمادات':'Approvals'}</small><strong>{audit.filter(x=>x.actionType==='approve').length}</strong></div>
                <div><small>{ar?'رفض وإرجاع':'Rejected / Returned'}</small><strong>{audit.filter(x=>['reject','return'].includes(x.actionType)).length}</strong></div>
                <div><small>{ar?'عمليات اليوم':'Today'}</small><strong>{audit.filter(x=>x.createdAt?.slice(0,10)===new Date().toISOString().slice(0,10)).length}</strong></div>
              </div>

              <div className="audit-filter-grid">
                <div className="settings-search audit-search"><span>⌕</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={ar?'بحث بالباركود أو رقم الفاتورة أو الحضانة...':'Search barcode, invoice, or nursery...'}/></div>
                <label><span>{ar?'من تاريخ':'From'}</span><input type="date" value={auditFilters.from} onChange={(e)=>setAuditFilters({...auditFilters,from:e.target.value})}/></label>
                <label><span>{ar?'إلى تاريخ':'To'}</span><input type="date" value={auditFilters.to} onChange={(e)=>setAuditFilters({...auditFilters,to:e.target.value})}/></label>
                <label><span>{ar?'المستخدم':'User'}</span><select value={auditFilters.user} onChange={(e)=>setAuditFilters({...auditFilters,user:e.target.value})}><option value="all">{ar?'كل المستخدمين':'All Users'}</option>{auditOptions.users.map(x=><option key={x}>{x}</option>)}</select></label>
                <label><span>{ar?'الحضانة':'Nursery'}</span><select value={auditFilters.nursery} onChange={(e)=>setAuditFilters({...auditFilters,nursery:e.target.value})}><option value="all">{ar?'كل الحضانات':'All Nurseries'}</option>{auditOptions.nurseries.map(x=><option key={x}>{x}</option>)}</select></label>
                <label><span>{ar?'الشاشة':'Screen'}</span><select value={auditFilters.screen} onChange={(e)=>setAuditFilters({...auditFilters,screen:e.target.value})}><option value="all">{ar?'كل الشاشات':'All Screens'}</option>{auditOptions.screens.map(x=><option key={x}>{x}</option>)}</select></label>
                <label><span>{ar?'نوع العملية':'Action Type'}</span><select value={auditFilters.action} onChange={(e)=>setAuditFilters({...auditFilters,action:e.target.value})}><option value="all">{ar?'كل العمليات':'All Actions'}</option><option value="create">{ar?'إضافة/رفع':'Create'}</option><option value="approve">{ar?'اعتماد':'Approve'}</option><option value="reject">{ar?'رفض':'Reject'}</option><option value="return">{ar?'إرجاع':'Return'}</option><option value="update">{ar?'تعديل':'Update'}</option><option value="transfer">{ar?'نقل':'Transfer'}</option><option value="surplus">{ar?'فائض':'Surplus'}</option><option value="disposal">{ar?'إسقاط':'Disposal'}</option><option value="delete">{ar?'حذف':'Delete'}</option><option value="login">{ar?'دخول':'Login'}</option></select></label>
              </div>

              <div className="settings-table-wrap">
                <table className="settings-table audit-table">
                  <thead><tr><th>{ar?'التاريخ والوقت':'Date & Time'}</th><th>{ar?'المستخدم':'User'}</th><th>{ar?'الجهة':'Organization'}</th><th>{ar?'الشاشة':'Screen'}</th><th>{ar?'العملية':'Action'}</th><th>{ar?'الرقم المرجعي':'Reference'}</th><th>{ar?'التفاصيل':'Details'}</th></tr></thead>
                  <tbody>{filteredLogs.map((log)=><tr key={log.id} onClick={()=>setSelectedAudit(log)}>
                    <td><strong>{log.date}</strong><small>{log.time}</small></td>
                    <td>{log.user}</td>
                    <td>{log.organization || log.nursery || '—'}</td>
                    <td>{log.screen}</td>
                    <td><span className={`audit-action ${actionTone(log.actionType)}`}>{log.action}</span></td>
                    <td><code>{log.entityId || '—'}</code></td>
                    <td>{log.details || '—'}{log.reason&&<small className="audit-reason-inline">{log.reason}</small>}</td>
                  </tr>)}</tbody>
                </table>
                {!filteredLogs.length&&<div className="invoice-empty">◷<strong>{ar?'لا توجد عمليات مطابقة للفلاتر الحالية.':'No matching audit entries.'}</strong></div>}
              </div>
            </article>
          )}

          {activeTab === 'info' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">ⓘ</span><div><h2>{t.info}</h2><p>{ar ? 'حالة النظام والخدمات المرتبطة.' : 'System and connected-service status.'}</p></div></div>
              <div className="system-info-grid">{systemStats.map(([label,value],index)=><div key={label}><span className={`info-dot ${index===4&&settings.invoice.aiEnabled?'online':''}`}></span><small>{label}</small><strong>{value}</strong></div>)}</div>
              <div className="connection-cards connection-cards-detailed">
                <div><span className="connection-icon online">✓</span><div><strong>{ar?'واجهة النظام':'Web Application'}</strong><small>{ar?'متصلة وتعمل':'Connected and operational'}</small></div></div>
                <div><span className={`connection-icon ${databaseMode?'online':'warning'}`}>{databaseMode?'✓':'◷'}</span><div><strong>{ar?'اتصال Supabase للواجهة':'Supabase Frontend Connection'}</strong><small>{databaseMode?(ar?'مفعّل — بيانات الاتصال العامة موجودة':'Enabled — public connection settings are present'):(ar?'غير مفعّل في نسخة التشغيل الحالية':'Not enabled in the current build')}</small></div></div>
                <div><span className={`connection-icon ${serverStatus.serverReachable?'online':'offline'}`}>{serverStatus.loading?'…':serverStatus.serverReachable?'✓':'!'}</span><div><strong>{ar?'خادم النظام':'Application Server'}</strong><small>{serverStatus.loading?(ar?'جاري التحقق...':'Checking...'):serverStatus.serverReachable?(ar?'الخادم يستجيب':'Server is reachable'):(ar?'تعذر الوصول إلى خدمة الخادم':'Server API is not reachable')}</small></div></div>
                <div><span className={`connection-icon ${serverStatus.supabaseServerUrl&&serverStatus.supabaseAnonKey?'online':'warning'}`}>{serverStatus.supabaseServerUrl&&serverStatus.supabaseAnonKey?'✓':'◷'}</span><div><strong>{ar?'إعدادات Supabase على الخادم':'Supabase Server Settings'}</strong><small>{serverStatus.supabaseServerUrl&&serverStatus.supabaseAnonKey?(ar?'عنوان المشروع ومفتاح الاتصال العام موجودان':'Project URL and anon key are configured'):(ar?'عنوان المشروع أو مفتاح الاتصال العام غير مكتمل':'Project URL or anon key is missing')}</small></div></div>
                <div><span className={`connection-icon ${serverStatus.supabaseServiceRoleKey?'online':'warning'}`}>{serverStatus.supabaseServiceRoleKey?'✓':'◷'}</span><div><strong>{ar?'خدمة إدارة الحسابات':'Account Administration Service'}</strong><small>{serverStatus.supabaseServiceRoleKey?(ar?'مفتاح الإدارة الآمن موجود على الخادم':'Secure service-role key is configured on the server'):(ar?'غير مفعّلة — يلزم إضافة SUPABASE_SERVICE_ROLE_KEY في بيئة الاستضافة':'Not enabled — add SUPABASE_SERVICE_ROLE_KEY to the hosting environment')}</small></div></div>
                <div className={`account-readiness-card ${serverStatus.accountManagementReady?'ready':'pending'}`}><span className={`connection-icon ${serverStatus.accountManagementReady?'online':'warning'}`}>{serverStatus.accountManagementReady?'✓':'!'}</span><div><strong>{ar?'إنشاء الحسابات الفعلية':'Production Account Creation'}</strong><small>{serverStatus.accountManagementReady?(ar?'جاهز لإنشاء حسابات الحضانات وموظفي الإدارة فعليًا':'Ready to create real nursery and administration accounts'):(ar?'غير جاهز بعد — أكمل إعدادات الخادم الموضحة أعلاه':'Not ready yet — complete the server settings shown above')}</small></div></div>
                <div><span className={`connection-icon ${settings.invoice.aiEnabled?'online':'offline'}`}>{settings.invoice.aiEnabled?'✓':'!'}</span><div><strong>OpenAI OCR</strong><small>{settings.invoice.aiEnabled?(ar?'مفعّل من إعدادات النظام':'Enabled in system settings'):(ar?'متوقف من الإعدادات':'Disabled in settings')}</small></div></div>
              </div>
              <div className="server-security-note">
                <strong>🔒 {ar?'تنبيه أمني':'Security note'}</strong>
                <p>{ar?'النظام يعرض حالة المفاتيح فقط (موجود/غير موجود) ولا يعرض قيمة أي مفتاح سري. مفتاح Service Role يجب أن يبقى في بيئة الاستضافة فقط ولا يوضع داخل ملفات الواجهة أو ملف ZIP.':'The system shows only whether keys are configured and never displays secret values. The Service Role key must remain only in the hosting environment and must not be placed in frontend files or the ZIP package.'}</p>
              </div>
            </article>
          )}
        </div>
      </div>


      {selectedAudit && (
        <div className="settings-modal-overlay" onClick={()=>setSelectedAudit(null)}>
          <aside className="audit-detail-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="drawer-header"><div><small>{ar?'تفاصيل العملية':'Action Details'}</small><h2>{selectedAudit.action}</h2></div><button type="button" onClick={()=>setSelectedAudit(null)}>×</button></div>
            <div className="audit-detail-status"><span className={`audit-action ${actionTone(selectedAudit.actionType)}`}>{selectedAudit.action}</span><code>{selectedAudit.entityId||'—'}</code></div>
            <div className="audit-detail-grid">
              <div><small>{ar?'المستخدم':'User'}</small><strong>{selectedAudit.user}</strong></div>
              <div><small>{ar?'الجهة':'Organization'}</small><strong>{selectedAudit.organization||'—'}</strong></div>
              <div><small>{ar?'التاريخ':'Date'}</small><strong>{selectedAudit.date}</strong></div>
              <div><small>{ar?'الوقت':'Time'}</small><strong>{selectedAudit.time}</strong></div>
              <div><small>{ar?'الشاشة':'Screen'}</small><strong>{selectedAudit.screen}</strong></div>
              <div><small>{ar?'الحضانة':'Nursery'}</small><strong>{selectedAudit.nursery||'—'}</strong></div>
              <div className="wide"><small>{ar?'التفاصيل':'Details'}</small><strong>{selectedAudit.details||'—'}</strong></div>
              {selectedAudit.reason&&<div className="wide audit-reason-box"><small>{ar?'السبب':'Reason'}</small><strong>{selectedAudit.reason}</strong></div>}
            </div>
            {(selectedAudit.before||selectedAudit.after)&&<div className="audit-change-grid">
              <div><small>{ar?'قبل العملية':'Before'}</small><pre>{JSON.stringify(selectedAudit.before,null,2)}</pre></div>
              <div><small>{ar?'بعد العملية':'After'}</small><pre>{JSON.stringify(selectedAudit.after,null,2)}</pre></div>
            </div>}
          </aside>
        </div>
      )}

      {nurseryModal && (
        <div className="settings-modal-overlay" onClick={()=>setNurseryModal(null)}>
          <form className="settings-modal" onSubmit={saveNursery} onClick={(e)=>e.stopPropagation()}>
            <div className="drawer-header"><div><small>SAAMS</small><h2>{nurseryModal.id?(ar?'تعديل حضانة':'Edit Nursery'):(ar?'إضافة حضانة':'Add Nursery')}</h2></div><button type="button" onClick={()=>setNurseryModal(null)}>×</button></div>
            <label><span>{ar?'اسم الحضانة':'Nursery Name'}</span><input name="name" defaultValue={nurseryModal.name||''} required /></label>
            <label><span>{ar?'المدير/المسؤول':'Manager'}</span><input name="manager" defaultValue={nurseryModal.manager||''} /></label>
            <div className="settings-modal-actions"><button className="secondary-action" type="button" onClick={()=>setNurseryModal(null)}>{ar?'إلغاء':'Cancel'}</button><button className="primary-action" type="submit">✓ {ar?'حفظ':'Save'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
