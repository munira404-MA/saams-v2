export default function About({ lang }) {
  const ar = lang === 'ar';
  const services = [
    ['Frontend', 'React + Vite', 'connected'],
    ['Database', 'Supabase PostgreSQL', 'connected'],
    ['Authentication', 'Supabase Auth', 'connected'],
    ['File Storage', 'Supabase Storage', 'connected'],
    ['OCR', 'OpenAI Vision API', 'connected'],
    ['Hosting', 'Vercel', 'connected'],
  ];
  const versions = [
    ['2.0', '05/08/2026', ar ? 'مركز العمليات المؤسسية ومحاضر الأصول الرسمية' : 'Enterprise operations center and official asset documents'],
    ['1.0', '05/08/2026', ar ? 'الإصدار الرسمي الأول' : 'First official release'],
    ['0.9', '05/08/2026', ar ? 'ربط قاعدة البيانات والسلف والفواتير' : 'Database, advances, and invoices connection'],
    ['0.8', '05/08/2026', ar ? 'الذكاء التحليلي ولوحة المدير العام' : 'Intelligence and executive dashboard'],
    ['0.7', '05/08/2026', ar ? 'سجل العمليات المؤسسي' : 'Enterprise audit log'],
  ];

  return (
    <section className="official-info-page">
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS Enterprise v2.0</span>
          <h1>{ar ? 'حول المنظومة' : 'About SAAMS'}</h1>
          <p>{ar ? 'معلومات الإصدار والحالة الفنية وسجل التحديثات.' : 'Release information, technical status, and version history.'}</p>
        </div>
      </div>

      <div className="about-hero">
        <div className="about-hero-logos">
          <img src="/academy-logo.png" alt="" />
          <img src="/nurseries-logo.png" alt="" />
        </div>
        <div>
          <span>SAAMS</span>
          <h2>{ar ? 'منظومة الأصول والسلف الذكية' : 'Smart Assets & Advances Management System'}</h2>
          <p>{ar ? 'منصة موحدة لإدارة الفواتير والأصول والسلف والتقارير والصلاحيات.' : 'A unified platform for invoices, assets, advances, reporting, and access control.'}</p>
        </div>
        <strong>v2.0</strong>
      </div>

      <div className="about-grid">
        <article className="about-card">
          <h3>{ar ? 'حالة الخدمات' : 'Service Status'}</h3>
          <div className="service-status-list">
            {services.map(([name, value]) => (
              <div key={name}>
                <span className="status-dot"></span>
                <strong>{name}</strong>
                <small>{value}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="about-card">
          <h3>{ar ? 'معلومات الإصدار' : 'Release Information'}</h3>
          <dl className="about-meta">
            <div><dt>{ar ? 'الإصدار' : 'Version'}</dt><dd>2.0.0</dd></div>
            <div><dt>{ar ? 'تاريخ الإصدار' : 'Release Date'}</dt><dd>05/08/2026</dd></div>
            <div><dt>{ar ? 'البيئة' : 'Environment'}</dt><dd>Production</dd></div>
            <div><dt>{ar ? 'اللغة الافتراضية' : 'Default Language'}</dt><dd>{ar ? 'العربية' : 'Arabic'}</dd></div>
          </dl>
        </article>
      </div>

      <article className="about-card version-history-card">
        <h3>{ar ? 'سجل الإصدارات' : 'Version History'}</h3>
        <div className="version-history">
          {versions.map(([version,date,text]) => (
            <div key={version}>
              <span>v{version}</span>
              <div><strong>{text}</strong><small>{date}</small></div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
