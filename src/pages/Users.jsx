import { useMemo, useState } from 'react';

export const USERS_STORAGE_KEY = 'saams-users-v1';

export const DEFAULT_USERS = [
  {
    id: 'USR-001',
    full_name: 'منيرة الأحمد',
    username: 'munira',
    password: '1234',
    role: 'super_admin',
    nursery: '',
    active: true,
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

const NURSERIES = [
  'الرحمانية الجديدة','اللؤلؤية','السيوح','واسط 2','الرحمانية','البديع','اللية','القليعة','البستان','كلباء','الساف','الطيبة','الحرس الأميري','الحمرية','المدينة الباسمة','الشرطي الصغير','الثميد','سهيلة','سهيلة الجديدة','البرير','مليحة','القادسية','دبا الحصن','السياقة','الشارقة النموذجية','مغيدر','واسط','الشيماء','المستقبل','غرفتي الصغيرة','جمانة','أم الفضل','جميلة','الباحثة','النحوة','جامعة خورفكان','جامعة كلباء','وادي الحلو','شيص'
];

const PAGE_PERMISSIONS = [
  ['dashboard', 'الرئيسية', 'Dashboard'],
  ['invoices', 'الفواتير', 'Invoices'],
  ['assets', 'الأصول', 'Assets'],
  ['advances', 'السلف', 'Advances'],
  ['reports', 'التقارير', 'Reports'],
  ['users', 'المستخدمون', 'Users'],
  ['settings', 'الإعدادات', 'Settings'],
];

const DEFAULT_ADMIN_PERMISSIONS = {
  dashboard: true,
  invoices: false,
  assets: false,
  advances: false,
  reports: false,
  users: false,
  settings: false,
};

const emptyForm = {
  full_name: '',
  username: '',
  password: '',
  role: 'nursery',
  nursery: '',
  active: true,
  permissions: { ...DEFAULT_ADMIN_PERMISSIONS },
};

export default function Users({ lang }) {
  const ar = lang === 'ar';
  const [users, setUsers] = useState(loadUsers);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => !q || [user.full_name, user.username, user.nursery, user.role].join(' ').toLowerCase().includes(q));
  }, [users, search]);

  function persist(next) {
    setUsers(next);
    saveUsers(next);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, permissions: { ...DEFAULT_ADMIN_PERMISSIONS } });
    setMessage('');
    setOpen(true);
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({ ...user, password: user.password || '', permissions: { ...DEFAULT_ADMIN_PERMISSIONS, ...(user.permissions || {}) } });
    setMessage('');
    setOpen(true);
  }

  function submit(e) {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!username || !form.password || !form.full_name.trim()) return;
    if (form.role === 'nursery' && !form.nursery) {
      setMessage(ar ? 'اختاري الحضانة.' : 'Select a nursery.');
      return;
    }
    const duplicate = users.some((u) => u.username.toLowerCase() === username && u.id !== editingId);
    if (duplicate) {
      setMessage(ar ? 'اسم المستخدم مستخدم مسبقًا.' : 'Username already exists.');
      return;
    }
    const payload = {
      ...form,
      username,
      nursery: form.role === 'nursery' ? form.nursery : '',
      permissions: form.role === 'admin'
        ? { ...DEFAULT_ADMIN_PERMISSIONS, ...(form.permissions || {}), dashboard: true }
        : {},
    };
    if (editingId) {
      persist(users.map((u) => u.id === editingId ? { ...u, ...payload } : u));
    } else {
      persist([...users, { ...payload, id: `USR-${String(Date.now()).slice(-6)}` }]);
    }
    setOpen(false);
  }

  function toggle(user) {
    persist(users.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
  }

  function remove(user) {
    if (user.role === 'super_admin' && users.filter((u) => u.role === 'super_admin').length === 1) {
      alert(ar ? 'لا يمكن حذف آخر مدير للنظام.' : 'The last system administrator cannot be deleted.');
      return;
    }
    if (confirm(ar ? `حذف المستخدم ${user.full_name}؟` : `Delete ${user.full_name}?`)) {
      persist(users.filter((u) => u.id !== user.id));
    }
  }

  const roleLabel = (role) => ({ super_admin: ar ? 'مدير النظام' : 'System Admin', admin: ar ? 'موظف إدارة' : 'Administration', nursery: ar ? 'حضانة' : 'Nursery' }[role]);

  return (
    <div className="users-page">
      <header className="users-heading">
        <div>
          <span className="eyebrow">SAAMS USERS</span>
          <h1>{ar ? 'إدارة المستخدمين' : 'User Management'}</h1>
          <p>{ar ? 'إنشاء حسابات الحضانات وموظفي الإدارة والتحكم بصلاحية الدخول.' : 'Create nursery and administration accounts and control access.'}</p>
        </div>
        <button className="primary-action" type="button" onClick={startCreate}>＋ {ar ? 'إضافة مستخدم' : 'Add User'}</button>
      </header>

      <section className="user-stat-grid">
        <article><span>♙</span><div><small>{ar ? 'إجمالي المستخدمين' : 'Total users'}</small><strong>{users.length}</strong></div></article>
        <article><span>⌂</span><div><small>{ar ? 'حسابات الحضانات' : 'Nursery accounts'}</small><strong>{users.filter((u) => u.role === 'nursery').length}</strong></div></article>
        <article><span>▣</span><div><small>{ar ? 'حسابات الإدارة' : 'Administration accounts'}</small><strong>{users.filter((u) => u.role !== 'nursery').length}</strong></div></article>
        <article><span>✓</span><div><small>{ar ? 'الحسابات النشطة' : 'Active accounts'}</small><strong>{users.filter((u) => u.active).length}</strong></div></article>
      </section>

      <section className="users-table-card">
        <div className="users-toolbar">
          <div className="invoice-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? 'بحث بالاسم أو اسم المستخدم أو الحضانة...' : 'Search name, username, or nursery...'} /></div>
        </div>
        <div className="users-table-wrap">
          <table className="users-table">
            <thead><tr><th>{ar ? 'الاسم' : 'Name'}</th><th>{ar ? 'اسم المستخدم' : 'Username'}</th><th>{ar ? 'كلمة المرور' : 'Password'}</th><th>{ar ? 'نوع الحساب' : 'Account type'}</th><th>{ar ? 'الحضانة' : 'Nursery'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th>{ar ? 'الإجراءات' : 'Actions'}</th></tr></thead>
            <tbody>{filtered.map((user) => <tr key={user.id}>
              <td><strong>{user.full_name}</strong><small>{user.id}</small></td>
              <td><code>{user.username}</code></td>
              <td>
                <div className="user-password-cell">
                  <code>{visiblePasswords[user.id] ? user.password : '••••••••'}</code>
                  <button type="button" onClick={() => setVisiblePasswords((current) => ({ ...current, [user.id]: !current[user.id] }))}>
                    {visiblePasswords[user.id] ? '◉' : '◎'}
                  </button>
                </div>
              </td>
              <td><span className={`user-role ${user.role}`}>{roleLabel(user.role)}</span></td>
              <td>{user.nursery || '—'}</td>
              <td><button className={`user-status ${user.active ? 'active' : 'inactive'}`} onClick={() => toggle(user)}>{user.active ? (ar ? 'نشط' : 'Active') : (ar ? 'موقوف' : 'Disabled')}</button></td>
              <td><div className="user-row-actions"><button onClick={() => startEdit(user)}>{ar ? 'تعديل' : 'Edit'}</button><button className="danger" onClick={() => remove(user)}>{ar ? 'حذف' : 'Delete'}</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
        <form className="user-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
          <div className="modal-title"><div><span className="eyebrow">USER ACCOUNT</span><h2>{editingId ? (ar ? 'تعديل المستخدم' : 'Edit User') : (ar ? 'إضافة مستخدم جديد' : 'Add New User')}</h2></div><button type="button" onClick={() => setOpen(false)}>×</button></div>
          <div className="user-form-grid">
            <label><span>{ar ? 'الاسم الكامل' : 'Full name'}</span><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
            <label><span>{ar ? 'اسم المستخدم' : 'Username'}</span><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
            <label><span>{ar ? 'كلمة المرور' : 'Password'}</span><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
            <label><span>{ar ? 'نوع الحساب' : 'Account type'}</span><select value={form.role} onChange={(e) => {
              const role = e.target.value;
              setForm({
                ...form,
                role,
                nursery: '',
                permissions: role === 'admin'
                  ? { ...DEFAULT_ADMIN_PERMISSIONS, ...(form.permissions || {}) }
                  : {},
              });
            }}><option value="nursery">{ar ? 'حساب حضانة' : 'Nursery account'}</option><option value="admin">{ar ? 'موظف إدارة' : 'Administration employee'}</option><option value="super_admin">{ar ? 'مدير النظام' : 'System administrator'}</option></select></label>
            {form.role === 'nursery' && <label className="wide"><span>{ar ? 'الحضانة' : 'Nursery'}</span><select value={form.nursery} onChange={(e) => setForm({ ...form, nursery: e.target.value })} required><option value="">{ar ? 'اختاري الحضانة' : 'Select nursery'}</option>{NURSERIES.map((n) => <option key={n}>{n}</option>)}</select></label>}
            {form.role === 'admin' && (
              <fieldset className="user-permissions wide">
                <legend>{ar ? 'الشاشات المسموح للمستخدم بالدخول إليها' : 'Screens this user can access'}</legend>
                <p>{ar ? 'اختاري الصلاحيات يدويًا حسب مهام الموظف. الشاشة الرئيسية مفعلة دائمًا.' : 'Select permissions manually. Dashboard is always enabled.'}</p>
                <div className="user-permissions-grid">
                  {PAGE_PERMISSIONS.map(([key, arLabel, enLabel]) => (
                    <label key={key} className={key === 'dashboard' ? 'locked' : ''}>
                      <input
                        type="checkbox"
                        checked={key === 'dashboard' ? true : Boolean(form.permissions?.[key])}
                        disabled={key === 'dashboard'}
                        onChange={(e) => setForm({
                          ...form,
                          permissions: { ...form.permissions, [key]: e.target.checked, dashboard: true },
                        })}
                      />
                      <span>{ar ? arLabel : enLabel}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="user-active-check wide"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>{ar ? 'الحساب نشط ويسمح له بتسجيل الدخول' : 'Account is active and can sign in'}</span></label>
          </div>
          {message && <div className="form-message">{message}</div>}
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</button><button className="primary-action">{ar ? 'حفظ المستخدم' : 'Save User'}</button></div>
        </form>
      </div>}
    </div>
  );
}
