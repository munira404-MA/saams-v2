import { useState } from 'react';

export default function Login({ lang, setLang, onLogin, busy, error }) {
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
            <span className="brand-kicker">SAAMS v2.3</span>
            <h2>{ar ? 'إدارة أكثر ذكاءً ودقة' : 'Smarter, more accurate management'}</h2>
            <p>
              {ar
                ? 'منصة موحدة لإدارة الأصول والسلف والفواتير الخاصة بحضانات الشارقة.'
                : 'A unified platform for managing assets, advances, and nursery invoices.'}
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
