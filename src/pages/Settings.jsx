import { useMemo, useRef, useState } from 'react';
import { DEFAULT_USERS, loadUsers, USERS_STORAGE_KEY } from './Users';

const NURSERIES_KEY = 'saams-settings-nurseries-v1';
const SETTINGS_KEY = 'saams-system-settings-v1';
const AUDIT_KEY = 'saams-audit-log-v1';

const DEFAULT_NURSERIES = [
  'الرحمانية الجديدة','اللؤلؤية','السيوح','واسط 2','الرحمانية','البديع','اللية','القليعة','البستان','كلباء',
  'الساف','الطيبة','الحرس الأميري','الحمرية','المدينة الباسمة','الشرطي الصغير','الثميد','سهيلة','سهيلة الجديدة',
  'البرير','مليحة','القادسية','دبا الحصن','السياقة','الشارقة النموذجية','مغيدر','واسط','الشيماء','المستقبل',
  'غرفتي الصغيرة','جمانة','أم الفضل','جميلة','الباحثة','النحوة','جامعة خورفكان','جامعة كلباء','وادي الحلو','شيص'
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

function addAudit(action, details, user = 'منيرة الأحمد') {
  const current = readJson(AUDIT_KEY, []);
  const next = [{
    id: `LOG-${Date.now()}`,
    date: new Date().toLocaleString('ar-AE'),
    user,
    action,
    details,
  }, ...current].slice(0, 100);
  writeJson(AUDIT_KEY, next);
  return next;
}

const labels = {
  ar: {
    title: 'الإعدادات',
    subtitle: 'مركز التحكم بإعدادات النظام والحضانات والتنبيهات والنسخ الاحتياطي.',
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

export default function Settings({ lang, profile, onProfileUpdate }) {
  const ar = lang === 'ar';
  const t = labels[lang] || labels.ar;
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(() => readJson(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [nurseries, setNurseries] = useState(() => readJson(NURSERIES_KEY, DEFAULT_NURSERIES));
  const [users, setUsers] = useState(loadUsers);
  const [audit, setAudit] = useState(() => readJson(AUDIT_KEY, [
    { id:'L1', date:'05/08/2026، 12:15 م', user:'منيرة الأحمد', action:'تسجيل دخول', details:'دخول مدير النظام' },
    { id:'L2', date:'05/08/2026، 11:42 ص', user:'حضانة القليعة', action:'رفع فاتورة', details:'رفع فاتورة جديدة للمراجعة' },
    { id:'L3', date:'05/08/2026، 10:18 ص', user:'منيرة الأحمد', action:'اعتماد طلب أصل', details:'اعتماد طلب نقل أصل' },
  ]));
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [nurseryModal, setNurseryModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [typeName, setTypeName] = useState('');
  const restoreRef = useRef(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  const navItems = [
    ['profile', t.profile],
    ...(isSuperAdmin ? [
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
    writeJson(NURSERIES_KEY, nurseries);
    writeJson(USERS_STORAGE_KEY, nextUsers);
    const logs = addAudit('تحديث الإعدادات', 'تم حفظ إعدادات النظام', profile?.full_name || 'المستخدم');
    setAudit(logs);
    if (showMessage) {
      setMessage(t.saved);
      window.setTimeout(() => setMessage(''), 2600);
    }
  }

  function resetDefaults() {
    const ok = window.confirm(ar ? 'هل تريدين استعادة الإعدادات الافتراضية؟' : 'Restore default settings?');
    if (!ok) return;
    setSettings(DEFAULT_SETTINGS);
    setNurseries(DEFAULT_NURSERIES);
    setMessage(ar ? 'تمت استعادة الإعدادات الافتراضية. اضغطي حفظ لتثبيتها.' : 'Defaults restored. Save to apply.');
  }

  function downloadBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: 'SAAMS v6.3',
      settings,
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
    const logs = addAudit('تنزيل نسخة احتياطية', 'تم تنزيل نسخة JSON', profile?.full_name || 'المستخدم');
    setAudit(logs);
  }

  async function restoreBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.settings || !Array.isArray(parsed.nurseries) || !Array.isArray(parsed.users)) throw new Error('invalid');
      setSettings(parsed.settings);
      setNurseries(parsed.nurseries);
      setUsers(parsed.users);
      setAudit(Array.isArray(parsed.audit) ? parsed.audit : audit);
      writeJson(SETTINGS_KEY, parsed.settings);
      writeJson(NURSERIES_KEY, parsed.nurseries);
      writeJson(USERS_STORAGE_KEY, parsed.users);
      if (Array.isArray(parsed.audit)) writeJson(AUDIT_KEY, parsed.audit);
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
    return audit.filter((item) => !q || [item.user,item.action,item.details,item.date].join(' ').toLowerCase().includes(q));
  }, [audit, search]);

  const systemStats = [
    [ar ? 'الإصدار' : 'Version', 'SAAMS v6.3'],
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
          <span className="eyebrow">SAAMS v6.3</span>
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
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">◷</span><div><h2>{t.audit}</h2><p>{ar ? 'آخر العمليات المسجلة داخل نسخة المعاينة.' : 'Recent actions recorded in the preview.'}</p></div></div>
              <div className="settings-search"><span>⌕</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={ar?'بحث في سجل العمليات...':'Search audit log...'}/></div>
              <div className="settings-table-wrap">
                <table className="settings-table">
                  <thead><tr><th>{ar?'التاريخ':'Date'}</th><th>{ar?'المستخدم':'User'}</th><th>{ar?'العملية':'Action'}</th><th>{ar?'التفاصيل':'Details'}</th></tr></thead>
                  <tbody>{filteredLogs.map((log)=><tr key={log.id}><td>{log.date}</td><td>{log.user}</td><td><strong>{log.action}</strong></td><td>{log.details}</td></tr>)}</tbody>
                </table>
              </div>
            </article>
          )}

          {activeTab === 'info' && (
            <article className="settings-card">
              <div className="settings-section-title"><span className="settings-section-icon">ⓘ</span><div><h2>{t.info}</h2><p>{ar ? 'حالة النظام والخدمات المرتبطة.' : 'System and connected-service status.'}</p></div></div>
              <div className="system-info-grid">{systemStats.map(([label,value],index)=><div key={label}><span className={`info-dot ${index===4&&settings.invoice.aiEnabled?'online':''}`}></span><small>{label}</small><strong>{value}</strong></div>)}</div>
              <div className="connection-cards">
                <div><span className="connection-icon online">✓</span><div><strong>{ar?'واجهة النظام':'Web Application'}</strong><small>{ar?'متصلة وتعمل':'Connected and operational'}</small></div></div>
                <div><span className={`connection-icon ${settings.invoice.aiEnabled?'online':'offline'}`}>{settings.invoice.aiEnabled?'✓':'!'}</span><div><strong>OpenAI OCR</strong><small>{settings.invoice.aiEnabled?(ar?'جاهز لقراءة الفواتير':'Ready for invoice reading'):(ar?'متوقف من الإعدادات':'Disabled in settings')}</small></div></div>
                <div><span className="connection-icon warning">◷</span><div><strong>Supabase</strong><small>{ar?'وضع المعاينة — الربط النهائي لاحقًا':'Preview mode — final connection pending'}</small></div></div>
              </div>
            </article>
          )}
        </div>
      </div>

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
