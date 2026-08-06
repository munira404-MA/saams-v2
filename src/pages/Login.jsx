import { recordAudit } from '../utils/audit';
import { useState } from 'react';

export default function Login({ lang, setLang, onLogin, busy, error, databaseMode }) {
  const ar = lang === 'ar';
  const [form, setForm] = useState({ username: '', password: '' });

  return (
    <div className="login-page">
      <button
        className="lang floating"
        type="button"
        onClick={() => setLang(ar ? 'en' : 'ar')}
      >
        {ar ? 'English' : 'العربية'}
      </button>

      <div className="login-layout">
        <section className="login-brand-panel" aria-label={ar ? 'شعارات الجهات' : 'Organization logos'}>
          <div className="login-logos">
            <img
              src="/nurseries-logo.png"
              alt={ar ? 'حضانات الشارقة' : 'Sharjah Nurseries'}
              className="login-logo nurseries-logo"
            />
            <span className="logo-divider" aria-hidden="true" />
            <img
              src="/academy-logo.png"
              alt={ar ? 'أكاديمية الشارقة للتعليم' : 'Sharjah Education Academy'}
              className="login-logo academy-logo"
            />
          </div>
          <div className="brand-copy">
            <span className="brand-kicker">SAAMS v3.0</span>
            <h2>{ar ? 'إدارة أكثر ذكاءً ودقة' : 'Smarter, more accurate management'}</h2>
            <p>
              {ar
                ? 'منصة موحدة لإدارة الأصول والسلف والفواتير الخاصة بحضانات الشارقة وأكاديمية الشارقة للتعليم.'
                : 'A unified platform for managing assets, advances, and invoices for Sharjah Nurseries and Sharjah Education Academy.'}
            </p>
          </div>
        </section>

        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(form);
          }}
        >
          <h1>{ar ? 'منظومة الأصول والسلف الذكية' : 'Smart Assets & Advances Management System'}</h1>
          <p>{ar ? 'تسجيل الدخول باسم المستخدم وكلمة المرور' : 'Sign in with username and password'}</p>
          <div className={`database-mode-badge ${databaseMode ? 'connected' : 'preview'}`}>
            <span>{databaseMode ? '●' : '◷'}</span>
            {databaseMode ? (ar ? 'متصل بقاعدة البيانات' : 'Database Connected') : (ar ? 'وضع المعاينة المحلية' : 'Local Preview Mode')}
          </div>

          <label>{ar ? 'اسم المستخدم' : 'Username'}</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            placeholder={ar ? 'اسم المستخدم' : 'Username'}
            required
          />

          <label>{ar ? 'كلمة المرور' : 'Password'}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            placeholder={ar ? 'كلمة المرور' : 'Password'}
            required
          />

          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? (ar ? 'جاري الدخول...' : 'Signing in...') : ar ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
