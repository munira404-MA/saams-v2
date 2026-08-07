import { useState } from 'react';

export default function Login({ lang, setLang, onLogin, busy, error, databaseMode }) {
  const ar = lang === 'ar';
  const [form, setForm] = useState({ username: '', password: '' });
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recovery, setRecovery] = useState({ username: 'munira', password: '', confirm: '', code: '' });
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  async function submitRecovery(e) {
    e.preventDefault();
    setRecoveryMessage('');
    setRecoverySuccess(false);
    if (recovery.password !== recovery.confirm) {
      setRecoveryMessage(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    if (recovery.password.length < 8) {
      setRecoveryMessage(ar ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' : 'The new password must be at least 8 characters.');
      return;
    }
    setRecoveryBusy(true);
    try {
      const response = await fetch('/api/admin-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ username: recovery.username, password: recovery.password, code: recovery.code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = {
          RECOVERY_NOT_CONFIGURED: ar ? 'خدمة الاسترداد غير مفعلة بعد. أضيفي SAAMS_ADMIN_RECOVERY_CODE في Vercel ثم أعيدي النشر.' : 'Recovery is not configured. Add SAAMS_ADMIN_RECOVERY_CODE in Vercel and redeploy.',
          INVALID_RECOVERY_CODE: ar ? 'رمز الاسترداد غير صحيح.' : 'The recovery code is incorrect.',
          PROFILE_NOT_FOUND: ar ? 'اسم المستخدم غير موجود في profiles.' : 'The username was not found in profiles.',
          NOT_SUPER_ADMIN: ar ? 'هذه الأداة مخصصة لمدير النظام فقط.' : 'This tool is only for a system administrator.',
          AUTH_USER_NOT_FOUND: ar ? 'ملف المستخدم موجود، لكن حساب Authentication المرتبط به غير موجود.' : 'The profile exists, but its Authentication user was not found.',
          WEAK_PASSWORD: ar ? 'اختاري كلمة مرور من 8 أحرف على الأقل.' : 'Choose a password with at least 8 characters.',
        };
        throw new Error(messages[result.code] || (ar ? `تعذر إعادة التعيين: ${result.error || 'خطأ غير معروف'}` : `Reset failed: ${result.error || 'Unknown error'}`));
      }
      setRecoverySuccess(true);
      setRecoveryMessage(ar ? 'تم تغيير كلمة مرور مدير النظام بنجاح. استخدمي كلمة المرور الجديدة لتسجيل الدخول.' : 'System administrator password updated successfully. Sign in with the new password.');
      setForm({ username: recovery.username, password: '' });
    } catch (err) {
      setRecoveryMessage(err.message);
    } finally {
      setRecoveryBusy(false);
    }
  }

  return (
    <div className="login-page">
      <button className="lang floating" type="button" onClick={() => setLang(ar ? 'en' : 'ar')}>
        {ar ? 'English' : 'العربية'}
      </button>

      <div className="login-layout">
        <section className="login-brand-panel" aria-label={ar ? 'شعارات الجهات' : 'Organization logos'}>
          <div className="login-logos">
            <img src="/nurseries-logo.png" alt={ar ? 'حضانات الشارقة' : 'Sharjah Nurseries'} className="login-logo nurseries-logo" />
            <span className="logo-divider" aria-hidden="true" />
            <img src="/academy-logo.png" alt={ar ? 'أكاديمية الشارقة للتعليم' : 'Sharjah Education Academy'} className="login-logo academy-logo" />
          </div>
          <div className="brand-copy">
            <span className="brand-kicker">{ar ? 'الإصدار 3.2' : 'SAAMS Enterprise · Version 3.2'}</span>
            <h2>{ar ? 'منظومة الأصول والسلف الذكية' : 'SAAMS Enterprise'}</h2>
            <p>{ar ? 'نظام إدارة الأصول والسلف والعمليات المالية' : 'Assets, Advances & Financial Operations Management System'}</p>
          </div>
        </section>

        <div className="login-card">
          {!recoveryOpen ? (
            <form onSubmit={(e) => { e.preventDefault(); onLogin(form); }}>
              <h1>{ar ? 'مرحبًا بكم' : 'Welcome'}</h1>
              <h2 className="login-system-name">{ar ? 'منظومة الأصول والسلف الذكية' : 'SAAMS Enterprise'}</h2>
              <p>{ar ? 'تسجيل الدخول باسم المستخدم وكلمة المرور' : 'Sign in with username and password'}</p>
              <div className={`database-mode-badge ${databaseMode ? 'connected' : 'preview'}`}>
                <span>{databaseMode ? '●' : '◷'}</span>
                {databaseMode ? (ar ? 'متصل بقاعدة البيانات' : 'Database Connected') : (ar ? 'وضع المعاينة المحلية' : 'Local Preview Mode')}
              </div>
              <label>{ar ? 'اسم المستخدم' : 'Username'}</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" placeholder={ar ? 'اسم المستخدم' : 'Username'} required />
              <label>{ar ? 'كلمة المرور' : 'Password'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" placeholder={ar ? 'كلمة المرور' : 'Password'} required />
              {error && <div className="error">{error}</div>}
              <button className="primary" disabled={busy}>{busy ? (ar ? 'جاري الدخول...' : 'Signing in...') : ar ? 'تسجيل الدخول' : 'Sign In'}</button>
              {databaseMode && (
                <button type="button" className="admin-recovery-link" onClick={() => { setRecoveryOpen(true); setRecoveryMessage(''); }}>
                  {ar ? 'إعادة تعيين كلمة مرور مدير النظام' : 'Reset system administrator password'}
                </button>
              )}
            </form>
          ) : (
            <form className="admin-recovery-form" onSubmit={submitRecovery}>
              <div className="admin-recovery-head">
                <span className="admin-recovery-icon">⌘</span>
                <div>
                  <h1>{ar ? 'استرداد حساب مدير النظام' : 'System Admin Recovery'}</h1>
                  <p>{ar ? 'إعادة تعيين آمنة عبر خادم النظام، بدون حذف الحساب أو تغيير الـ UID.' : 'Secure server-side reset without deleting the account or changing its UID.'}</p>
                </div>
              </div>
              <div className="admin-recovery-notice">🔒 {ar ? 'رمز الاسترداد محفوظ في Vercel فقط ولا يتم حفظه في المتصفح.' : 'The recovery code is stored only in Vercel and is not saved in the browser.'}</div>
              <label>{ar ? 'اسم مستخدم مدير النظام' : 'System admin username'}</label>
              <input value={recovery.username} onChange={(e) => setRecovery({ ...recovery, username: e.target.value })} autoComplete="username" required />
              <label>{ar ? 'كلمة المرور الجديدة' : 'New password'}</label>
              <input type="password" value={recovery.password} onChange={(e) => setRecovery({ ...recovery, password: e.target.value })} autoComplete="new-password" required />
              <label>{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
              <input type="password" value={recovery.confirm} onChange={(e) => setRecovery({ ...recovery, confirm: e.target.value })} autoComplete="new-password" required />
              <label>{ar ? 'رمز استرداد مدير النظام' : 'System admin recovery code'}</label>
              <input type="password" value={recovery.code} onChange={(e) => setRecovery({ ...recovery, code: e.target.value })} autoComplete="off" required />
              {recoveryMessage && <div className={recoverySuccess ? 'admin-recovery-success' : 'error'}>{recoveryMessage}</div>}
              <div className="admin-recovery-actions">
                <button className="primary" disabled={recoveryBusy}>{recoveryBusy ? (ar ? 'جاري إعادة التعيين...' : 'Resetting...') : (ar ? 'تغيير كلمة المرور' : 'Change Password')}</button>
                <button type="button" className="admin-recovery-cancel" onClick={() => { setRecoveryOpen(false); setRecoveryMessage(''); setRecoverySuccess(false); }}>{ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
