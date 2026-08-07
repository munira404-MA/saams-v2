import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { listNurseries, findNurseryByName } from '../data/supabaseData';

export const USERS_STORAGE_KEY = 'saams-users-v1';

export const DEFAULT_USERS = [
  {
    id: 'USR-001',
    full_name: 'منيرة الأحمد',
    username: 'munira',
    password: '1234',
    role: 'super_admin',
    nursery: '',
    nursery_id: null,
    active: true,
    last_login: 'اليوم',
    last_activity: 'تسجيل الدخول',
    data_scope: 'all',
  },
];

export function loadUsers() {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

const DEFAULT_NURSERIES = [
  'الرحمانية الجديدة','اللؤلؤية','السيوح','واسط 2','الرحمانية','البديع','اللية','القليعة','البستان','كلباء','الساف','الطيبة','الحرس الأميري','الحمرية','المدينة الباسمة','الشرطي الصغير','الثميد','سهيلة','سهيلة الجديدة','البرير','مليحة','القادسية','دبا الحصن','السياقة','الشارقة النموذجية','مغيدر','واسط','الشيماء','المستقبل','غرفتي الصغيرة','جمانة','أم الفضل','جميلة','الباحثة','النحوة','جامعة خورفكان','جامعة كلباء','وادي الحلو','شيص'
];

const PAGE_PERMISSIONS = [
  ['dashboard', 'الرئيسية', 'Dashboard'],
  ['commandcenter', 'مركز القيادة التنفيذي', 'Executive Command Center'],
  ['invoices', 'الفواتير', 'Invoices'],
  ['assets', 'الأصول', 'Assets'],
  ['advances', 'السلف', 'Advances'],
  ['reports', 'التقارير', 'Reports'],
  ['attachments', 'مركز المرفقات', 'Attachment Center'],
  ['users', 'المستخدمون', 'Users'],
  ['settings', 'الإعدادات', 'Settings'],
  ['help', 'المساعدة', 'Help'],
  ['about', 'حول المنظومة', 'About SAAMS'],
];

const PERMISSION_GROUPS = [
  { id: 'main', icon: '⌂', arLabel: 'الرئيسية', enLabel: 'Main', keys: ['dashboard'] },
  { id: 'management', icon: '▣', arLabel: 'الإدارة', enLabel: 'Management', keys: ['invoices', 'assets', 'advances', 'reports', 'attachments'] },
  { id: 'executive', icon: '♛', arLabel: 'الإدارة التنفيذية', enLabel: 'Executive', keys: ['commandcenter'] },
  { id: 'system', icon: '⚙', arLabel: 'النظام', enLabel: 'System', keys: ['users', 'settings', 'help', 'about'] },
];

const PERMISSION_LOOKUP = Object.fromEntries(PAGE_PERMISSIONS.map(([key, arLabel, enLabel]) => [key, { arLabel, enLabel }]));

const DEFAULT_ADMIN_PERMISSIONS = {
  dashboard: true,
  commandcenter: false,
  invoices: false,
  assets: false,
  advances: false,
  reports: false,
  attachments: false,
  users: false,
  settings: false,
  help: true,
  about: true,
};

const emptyForm = {
  full_name: '',
  username: '',
  password: '',
  role: 'nursery',
  nursery: '',
  nursery_id: null,
  active: true,
  permissions: { ...DEFAULT_ADMIN_PERMISSIONS },
  data_scope: 'nursery_only',
};

function friendlyAccountError(error, ar) {
  const code = error?.code || '';
  const message = String(error?.message || '');

  if (code === 'MISSING_ENV' || message.includes('Missing Supabase server environment variables')) {
    return ar
      ? 'لم يتم تفعيل خدمة إنشاء الحسابات على الخادم بعد. يرجى استكمال إعدادات Supabase من بيئة الاستضافة.'
      : 'The account-creation service is not enabled on the server yet. Complete the Supabase hosting environment settings.';
  }
  if (code === 'INVALID_SESSION' || code === 'MISSING_TOKEN' || /Invalid session/i.test(message)) {
    return ar ? 'انتهت جلسة الدخول أو لم يتم التحقق منها. تم تحديث الجلسة تلقائيًا؛ إذا استمرت الرسالة سجّلي الخروج ثم الدخول مرة أخرى.' : 'Your session is not valid. The app attempted to refresh it automatically; if this continues, sign out and sign in again.';
  }
  if (code === 'PROFILE_NOT_FOUND') {
    return ar ? 'تم تسجيل الدخول في Supabase، لكن ملف المستخدم المرتبط بهذه الجلسة غير موجود في جدول profiles.' : 'You are signed in to Supabase, but the profile linked to this session was not found.';
  }
  if (code === 'FORBIDDEN' || /Super admin required/i.test(message)) {
    const details = error?.details || {};
    const role = details.caller_role ? ` (${details.caller_role})` : '';
    return ar ? `تم التحقق من الجلسة، لكن الخادم لم يتعرف على الحساب كمدير نظام${role}.` : `The session was verified, but the server did not recognize this account as a system administrator${role}.`;
  }
  if (/already.*registered|already.*exists|duplicate/i.test(message)) {
    return ar ? 'اسم المستخدم أو الحساب موجود مسبقًا. اختاري اسم مستخدم مختلفًا.' : 'This username or account already exists. Choose a different username.';
  }
  return ar ? `تعذر إكمال العملية: ${message || 'حدث خطأ غير متوقع.'}` : `Could not complete the action: ${message || 'Unexpected error.'}`;
}

function formatLastLogin(value, ar) {
  if (!value) return ar ? 'لم يسجل الدخول بعد' : 'Never signed in';
  if (value === 'اليوم') return value;
  try {
    return new Intl.DateTimeFormat(ar ? 'ar-AE' : 'en-AE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Users({ lang, profile, databaseMode = false }) {
  const ar = lang === 'ar';
  const [users, setUsers] = useState(loadUsers);
  const [nurseryRecords, setNurseryRecords] = useState(DEFAULT_NURSERIES.map((name, index) => ({ id: null, name_ar: name, name_en: '', order: index + 1 })));
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function adminApi(payload) {
    // Always refresh the Supabase session before privileged account operations so
    // the API receives a current access token rather than a stale cached token.
    let session = null;
    const refreshed = await supabase.auth.refreshSession();
    if (!refreshed.error && refreshed.data?.session) session = refreshed.data.session;
    if (!session) {
      const current = await supabase.auth.getSession();
      session = current.data?.session || null;
    }
    const token = session?.access_token;
    if (!token) {
      const error = new Error('Invalid session');
      error.code = 'INVALID_SESSION';
      throw error;
    }

    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'REQUEST_FAILED');
      error.code = result.code || '';
      error.details = result;
      throw error;
    }
    return result;
  }

  async function refreshProductionUsers() {
    if (!databaseMode || profile?.role !== 'super_admin') return;
    setLoadingUsers(true);
    try {
      const result = await adminApi({ action: 'list' });
      setUsers(result.users || []);
    } catch (error) {
      setMessage(friendlyAccountError(error, ar));
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadProductionData() {
      if (!databaseMode) return;
      try {
        const rows = await listNurseries();
        if (!cancelled && rows?.length) setNurseryRecords(rows.filter((row) => row.active !== false));
      } catch {}
      if (!cancelled) await refreshProductionUsers();
    }
    loadProductionData();
    return () => { cancelled = true; };
  }, [databaseMode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => !q || [user.full_name, user.username, user.nursery, user.role].join(' ').toLowerCase().includes(q));
  }, [users, search]);

  const nurseryAccounts = users.filter((u) => u.role === 'nursery');
  const nurseryAccountNames = new Set(nurseryAccounts.map((u) => u.nursery).filter(Boolean));
  const missingNurseries = nurseryRecords.filter((n) => !nurseryAccountNames.has(n.name_ar));

  function persist(next) {
    setUsers(next);
    saveUsers(next);
  }

  function suggestedUsername(nurseryName) {
    const index = Math.max(0, nurseryRecords.findIndex((n) => n.name_ar === nurseryName));
    return `nursery${String(index + 1).padStart(2, '0')}`;
  }

  function startCreate(role = 'nursery') {
    setEditingId(null);
    setForm({
      ...emptyForm,
      role,
      data_scope: role === 'nursery' ? 'nursery_only' : role === 'super_admin' ? 'all' : 'permissions',
      permissions: role === 'admin' ? { ...DEFAULT_ADMIN_PERMISSIONS } : {},
    });
    setMessage('');
    setOpen(true);
  }

  function startNurseryCreate() {
    startCreate('nursery');
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      ...user,
      password: '',
      permissions: { ...DEFAULT_ADMIN_PERMISSIONS, ...(user.permissions || {}) },
      data_scope: user.role === 'nursery' ? 'nursery_only' : user.role === 'super_admin' ? 'all' : 'permissions',
    });
    setMessage('');
    setOpen(true);
  }

  function chooseNursery(name) {
    const rec = nurseryRecords.find((n) => n.name_ar === name);
    const autoName = !editingId && (!form.full_name || form.full_name === form.nursery);
    const autoUsername = !editingId && (!form.username || /^nursery\d+$/i.test(form.username));
    setForm({
      ...form,
      nursery: name,
      nursery_id: rec?.id || null,
      full_name: autoName ? name : form.full_name,
      username: autoUsername ? suggestedUsername(name) : form.username,
      data_scope: 'nursery_only',
    });
  }

  async function submit(e) {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!username || !form.full_name.trim() || (!editingId && !form.password)) return;
    if (form.role === 'nursery' && !form.nursery) {
      setMessage(ar ? 'اختاري الحضانة.' : 'Select a nursery.');
      return;
    }
    const duplicate = users.some((u) => u.username.toLowerCase() === username && u.id !== editingId);
    if (duplicate) {
      setMessage(ar ? 'اسم المستخدم مستخدم مسبقًا.' : 'Username already exists.');
      return;
    }
    const duplicateNursery = form.role === 'nursery' && users.some((u) => u.role === 'nursery' && u.nursery === form.nursery && u.id !== editingId);
    if (duplicateNursery) {
      setMessage(ar ? 'هذه الحضانة لديها حساب مرتبط بالفعل. عدّلي الحساب الحالي بدل إنشاء حساب آخر.' : 'This nursery already has a linked account. Edit the existing account instead.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      let nurseryId = form.nursery_id || null;
      if (databaseMode && form.role === 'nursery' && !nurseryId) {
        const row = await findNurseryByName(form.nursery);
        nurseryId = row?.id || null;
        if (!nurseryId) throw new Error(ar ? 'الحضانة غير موجودة في قاعدة البيانات.' : 'Nursery not found in database.');
      }

      const payload = {
        ...form,
        username,
        nursery_id: form.role === 'nursery' ? nurseryId : null,
        nursery: form.role === 'nursery' ? form.nursery : '',
        permissions: form.role === 'admin' ? { ...DEFAULT_ADMIN_PERMISSIONS, ...(form.permissions || {}), dashboard: true } : {},
        data_scope: form.role === 'nursery' ? 'nursery_only' : form.role === 'super_admin' ? 'all' : 'permissions',
      };

      if (databaseMode) {
        const result = await adminApi({ action: editingId ? 'update' : 'create', id: editingId || undefined, user: payload });
        setUsers(result.users || []);
      } else {
        const localPayload = {
          ...payload,
          password: editingId && !form.password ? (users.find((u) => u.id === editingId)?.password || '') : form.password,
          last_login: editingId ? (form.last_login || 'اليوم') : 'لم يسجل الدخول بعد',
          last_activity: editingId ? 'تحديث الحساب' : 'تم إنشاء الحساب',
        };
        if (editingId) persist(users.map((u) => u.id === editingId ? { ...u, ...localPayload } : u));
        else persist([...users, { ...localPayload, id: `USR-${String(Date.now()).slice(-6)}` }]);
      }
      setOpen(false);
    } catch (error) {
      setMessage(friendlyAccountError(error, ar));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user) {
    if (databaseMode) {
      try {
        const result = await adminApi({ action: 'toggle', id: user.id, active: !user.active });
        setUsers(result.users || []);
      } catch (error) {
        setMessage(friendlyAccountError(error, ar));
      }
      return;
    }
    persist(users.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
  }

  async function remove(user) {
    if (user.role === 'super_admin' && users.filter((u) => u.role === 'super_admin' && u.active).length === 1) {
      alert(ar ? 'لا يمكن حذف آخر مدير للنظام.' : 'The last system administrator cannot be deleted.');
      return;
    }
    if (!confirm(ar ? `حذف المستخدم ${user.full_name}؟` : `Delete ${user.full_name}?`)) return;
    if (databaseMode) {
      try {
        const result = await adminApi({ action: 'delete', id: user.id });
        setUsers(result.users || []);
      } catch (error) {
        setMessage(friendlyAccountError(error, ar));
      }
      return;
    }
    persist(users.filter((u) => u.id !== user.id));
  }

  const roleLabel = (role) => ({ super_admin: ar ? 'مدير النظام' : 'System Admin', admin: ar ? 'موظف إدارة' : 'Administration', nursery: ar ? 'حضانة' : 'Nursery' }[role]);
  const scopeLabel = (user) => user.role === 'nursery'
    ? (ar ? 'الحضانة فقط' : 'Nursery only')
    : user.role === 'super_admin'
      ? (ar ? 'كامل النظام' : 'Full system')
      : (ar ? 'حسب الصلاحيات' : 'By permissions');

  return (
    <div className="users-page">
      <header className="users-heading">
        <div>
          <span className="eyebrow">SAAMS USERS</span>
          <h1>{ar ? 'إدارة المستخدمين' : 'User Management'}</h1>
          <p>{ar ? 'حسابات التشغيل الفعلي مع ربط كل حضانة بنطاق بياناتها فقط.' : 'Production accounts with each nursery locked to its own data scope.'}</p>
        </div>
        <div className="users-heading-actions">
          <button className="secondary-action nursery-quick-action" type="button" onClick={startNurseryCreate}>⌂ {ar ? 'إنشاء حساب حضانة' : 'Create Nursery Account'}</button>
          <button className="primary-action" type="button" onClick={() => startCreate('admin')}>＋ {ar ? 'إضافة مستخدم' : 'Add User'}</button>
        </div>
      </header>

      <section className={`production-user-banner ${databaseMode ? 'live' : 'preview'}`}>
        <div>
          <span>{databaseMode ? '●' : '◷'}</span>
          <div>
            <strong>{databaseMode ? (ar ? 'حسابات التشغيل الفعلي' : 'Production accounts') : (ar ? 'وضع المعاينة' : 'Preview mode')}</strong>
            <small>{databaseMode ? (ar ? 'أي حساب يتم إنشاؤه هنا يُنشأ فعليًا في Supabase.' : 'Accounts created here are created in Supabase.') : (ar ? 'الحسابات محفوظة محليًا إلى حين ربط قاعدة البيانات.' : 'Accounts are local until the database is connected.')}</small>
          </div>
        </div>
        <b>{ar ? `${missingNurseries.length} حضانة بدون حساب` : `${missingNurseries.length} nurseries without accounts`}</b>
      </section>

      <section className="user-stat-grid">
        <article><span>♙</span><div><small>{ar ? 'إجمالي المستخدمين' : 'Total users'}</small><strong>{users.length}</strong></div></article>
        <article><span>⌂</span><div><small>{ar ? 'حسابات الحضانات' : 'Nursery accounts'}</small><strong>{nurseryAccounts.length}</strong></div></article>
        <article><span>✓</span><div><small>{ar ? 'حضانات جاهزة للحساب' : 'Nurseries linked'}</small><strong>{nurseryRecords.length - missingNurseries.length}/{nurseryRecords.length}</strong></div></article>
        <article><span>●</span><div><small>{ar ? 'الحسابات النشطة' : 'Active accounts'}</small><strong>{users.filter((u) => u.active).length}</strong></div></article>
      </section>

      {message && !open && <div className="users-page-message">{message}</div>}

      <section className="users-table-card">
        <div className="users-toolbar">
          <div className="invoice-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? 'بحث بالاسم أو اسم المستخدم أو الحضانة...' : 'Search name, username, or nursery...'} /></div>
          {loadingUsers && <span className="users-loading">{ar ? 'جاري تحميل الحسابات...' : 'Loading accounts...'}</span>}
        </div>
        <div className="users-table-wrap">
          <table className="users-table">
            <thead><tr><th>{ar ? 'الاسم' : 'Name'}</th><th>{ar ? 'اسم المستخدم' : 'Username'}</th><th>{ar ? 'نوع الحساب' : 'Account type'}</th><th>{ar ? 'الحضانة' : 'Nursery'}</th><th>{ar ? 'نطاق البيانات' : 'Data scope'}</th><th>{ar ? 'آخر دخول' : 'Last login'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th>{ar ? 'الإجراءات' : 'Actions'}</th></tr></thead>
            <tbody>{filtered.map((user) => <tr key={user.id}>
              <td><div className="user-identity-cell"><span>{(user.full_name || '?').charAt(0)}</span><div><strong>{user.full_name}</strong><small>{String(user.id).slice(0, 18)}</small></div></div></td>
              <td><code>{user.username}</code></td>
              <td><span className={`user-role ${user.role}`}>{roleLabel(user.role)}</span></td>
              <td>{user.nursery || '—'}</td>
              <td><span className={`data-scope-badge ${user.role}`}>{user.role === 'nursery' ? '🔒 ' : ''}{scopeLabel(user)}</span></td>
              <td><div className="user-activity-cell"><strong>{formatLastLogin(user.last_login, ar)}</strong><small>{user.last_activity || (databaseMode ? (ar ? 'حساب فعلي' : 'Production account') : (ar ? 'حساب معاينة' : 'Preview account'))}</small></div></td>
              <td><button className={`user-status ${user.active ? 'active' : 'inactive'}`} onClick={() => toggle(user)}>{user.active ? (ar ? 'نشط' : 'Active') : (ar ? 'موقوف' : 'Disabled')}</button></td>
              <td><div className="user-row-actions"><button onClick={() => startEdit(user)}>{ar ? 'تعديل' : 'Edit'}</button><button className="danger" onClick={() => remove(user)}>{ar ? 'حذف' : 'Delete'}</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      {open && <div className="modal-backdrop" onMouseDown={() => !busy && setOpen(false)}>
        <form className="user-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
          <div className="modal-title"><div><span className="eyebrow">USER ACCOUNT</span><h2>{editingId ? (ar ? 'تعديل المستخدم' : 'Edit User') : form.role === 'nursery' ? (ar ? 'إنشاء حساب حضانة' : 'Create Nursery Account') : (ar ? 'إضافة مستخدم جديد' : 'Add New User')}</h2></div><button type="button" disabled={busy} onClick={() => setOpen(false)}>×</button></div>

          {form.role === 'nursery' && <div className="nursery-scope-notice"><span>🔒</span><div><strong>{ar ? 'نطاق البيانات مقفل تلقائيًا' : 'Data scope is automatically locked'}</strong><small>{ar ? 'هذا الحساب سيشاهد فواتير وأصول وسلف وتقارير الحضانة المختارة فقط، ولا يمكنه الاطلاع على أي حضانة أخرى.' : 'This account can only see invoices, assets, advances and reports for the selected nursery.'}</small></div></div>}

          <div className="user-form-grid">
            {form.role === 'nursery' && <label className="wide"><span>{ar ? 'الحضانة' : 'Nursery'}</span><select value={form.nursery} onChange={(e) => chooseNursery(e.target.value)} required><option value="">{ar ? 'اختاري الحضانة' : 'Select nursery'}</option>{nurseryRecords.map((n) => <option key={n.id || n.name_ar} value={n.name_ar} disabled={!editingId && nurseryAccountNames.has(n.name_ar)}>{n.name_ar}{!editingId && nurseryAccountNames.has(n.name_ar) ? (ar ? ' — لديها حساب' : ' — account exists') : ''}</option>)}</select></label>}
            <label><span>{ar ? 'الاسم الكامل / اسم الحساب' : 'Full name / Account name'}</span><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
            <label><span>{ar ? 'اسم المستخدم' : 'Username'}</span><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })} required /><small className="field-hint">{ar ? 'أحرف إنجليزية وأرقام فقط' : 'English letters and numbers only'}</small></label>
            <label><span>{editingId ? (ar ? 'كلمة مرور جديدة (اختياري)' : 'New password (optional)') : (ar ? 'كلمة المرور المؤقتة' : 'Temporary password')}</span><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} /></label>
            <label><span>{ar ? 'نوع الحساب' : 'Account type'}</span><select value={form.role} onChange={(e) => {
              const role = e.target.value;
              setForm({ ...form, role, nursery: '', nursery_id: null, data_scope: role === 'nursery' ? 'nursery_only' : role === 'super_admin' ? 'all' : 'permissions', permissions: role === 'admin' ? { ...DEFAULT_ADMIN_PERMISSIONS, ...(form.permissions || {}) } : {} });
            }}><option value="nursery">{ar ? 'حساب حضانة' : 'Nursery account'}</option><option value="admin">{ar ? 'موظف إدارة' : 'Administration employee'}</option><option value="super_admin">{ar ? 'مدير النظام' : 'System administrator'}</option></select></label>

            {form.role === 'admin' && (
              <fieldset className="user-permissions wide">
                <legend>{ar ? 'الشاشات المسموح للمستخدم بالدخول إليها' : 'Screens this user can access'}</legend>
                <p>{ar ? 'أنتِ تحددين الصلاحيات يدويًا حسب مهام الموظف. الشاشة الرئيسية مفعلة دائمًا.' : 'Select permissions manually. Dashboard is always enabled.'}</p>
                <div className="permission-groups">
                  {PERMISSION_GROUPS.map((group) => (
                    <section className={`permission-group permission-group-${group.id}`} key={group.id}>
                      <header><span>{group.icon}</span><div><strong>{ar ? group.arLabel : group.enLabel}</strong><small>{ar ? `${group.keys.filter((key) => key === 'dashboard' || form.permissions?.[key]).length} من ${group.keys.length} مفعلة` : `${group.keys.filter((key) => key === 'dashboard' || form.permissions?.[key]).length} of ${group.keys.length} enabled`}</small></div></header>
                      <div className="permission-group-items">
                        {group.keys.map((key) => {
                          const labels = PERMISSION_LOOKUP[key];
                          const locked = key === 'dashboard';
                          return <label key={key} className={locked ? 'locked' : ''}>
                            <input type="checkbox" checked={locked ? true : Boolean(form.permissions?.[key])} disabled={locked} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [key]: e.target.checked, dashboard: true } })} />
                            <span>{ar ? labels.arLabel : labels.enLabel}</span>{locked && <small>{ar ? 'مفعلة دائمًا' : 'Always enabled'}</small>}
                          </label>;
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="user-active-check wide"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>{ar ? 'الحساب نشط ويسمح له بتسجيل الدخول' : 'Account is active and can sign in'}</span></label>
          </div>
          {message && <div className="form-message">{message}</div>}
          <div className="modal-actions"><button type="button" className="secondary-action" disabled={busy} onClick={() => setOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</button><button className="primary-action" disabled={busy}>{busy ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ المستخدم' : 'Save User')}</button></div>
        </form>
      </div>}
    </div>
  );
}
