import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const t = {
  ar: {
    title: 'منظومة الأصول والسلف الذكية',
    subtitle: 'تسجيل الدخول إلى SAAMS v2',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جاري تسجيل الدخول...',
    invalid: 'تعذر تسجيل الدخول. تأكدي من اسم المستخدم وكلمة المرور.',
    dashboard: 'لوحة التحكم التنفيذية',
    welcome: 'مرحبًا',
    role: 'الصلاحية',
    invoices: 'الفواتير',
    advances: 'السلف',
    assets: 'الأصول',
    reports: 'التقارير',
    users: 'المستخدمون',
    logout: 'تسجيل الخروج',
    loading: 'جاري تحميل الحساب...',
    noProfile: 'تم تسجيل الدخول، لكن لم يتم العثور على ملف المستخدم في جدول profiles.',
    language: 'English',
  },
  en: {
    title: 'Smart Assets & Advances Management System',
    subtitle: 'Sign in to SAAMS v2',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    invalid: 'Unable to sign in. Check the username and password.',
    dashboard: 'Executive Dashboard',
    welcome: 'Welcome',
    role: 'Role',
    invoices: 'Invoices',
    advances: 'Advances',
    assets: 'Assets',
    reports: 'Reports',
    users: 'Users',
    logout: 'Sign Out',
    loading: 'Loading account...',
    noProfile: 'Signed in, but no matching profile was found in the profiles table.',
    language: 'العربية',
  },
}

function usernameToEmail(username) {
  const clean = username.trim().toLowerCase()
  if (clean === 'admin') return import.meta.env.VITE_ADMIN_EMAIL
  return `${clean}@${import.meta.env.VITE_USER_EMAIL_DOMAIN || 'saams.app'}`
}

function App() {
  const [lang, setLang] = useState('ar')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const x = t[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  useEffect(() => {
    let mounted = true

    async function loadProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, role, nursery_id, is_active')
        .eq('id', userId)
        .single()

      if (!mounted) return
      if (error) {
        setProfile(null)
        setError(x.noProfile)
      } else {
        setProfile(data)
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const current = data.session ?? null
      setSession(current)
      if (current?.user?.id) await loadProfile(current.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setProfile(null)
      setError('')
      if (nextSession?.user?.id) await loadProfile(nextSession.user.id)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const email = usernameToEmail(form.username)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: form.password,
    })

    if (error) setError(x.invalid)
    setBusy(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="center-screen"><div className="loader-card">{x.loading}</div></div>
  }

  if (!session) {
    return (
      <main className="login-page">
        <button className="lang-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          {x.language}
        </button>

        <section className="login-card">
          <div className="brand-mark">SAAMS</div>
          <h1>{x.title}</h1>
          <p>{x.subtitle}</p>

          <form onSubmit={handleLogin}>
            <label>{x.username}</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              required
            />

            <label>{x.password}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />

            {error && <div className="error">{error}</div>}

            <button className="primary-btn" disabled={busy}>
              {busy ? x.signingIn : x.signIn}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside>
        <div className="side-brand">
          <strong>{x.title}</strong>
          <small>SAAMS v2.0</small>
        </div>
        <nav>
          <button className="active">⌂ {x.dashboard}</button>
          <button>▤ {x.invoices}</button>
          <button>▥ {x.advances}</button>
          <button>▣ {x.assets}</button>
          <button>▥ {x.reports}</button>
          {profile?.role === 'super_admin' && <button>👥 {x.users}</button>}
        </nav>
        <button className="logout" onClick={handleLogout}>{x.logout}</button>
      </aside>

      <section className="content">
        <header>
          <div>
            <span className="pill">SAAMS v2</span>
            <h2>{x.dashboard}</h2>
            <p>{x.welcome}، {profile?.full_name || profile?.username || '—'}</p>
          </div>
          <button className="lang-btn inline" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {x.language}
          </button>
        </header>

        {error && <div className="error">{error}</div>}

        <div className="welcome-card">
          <h3>{x.welcome}، {profile?.full_name || '—'}</h3>
          <p>{x.role}: {profile?.role || '—'}</p>
        </div>

        <div className="metrics">
          <article><strong>0</strong><span>{x.invoices}</span></article>
          <article><strong>0</strong><span>{x.advances}</span></article>
          <article><strong>0</strong><span>{x.assets}</span></article>
          <article><strong>0</strong><span>{x.reports}</span></article>
        </div>
      </section>
    </div>
  )
}

export default App
