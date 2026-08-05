export default function WhatsNew({ lang }) {
  const ar = lang === 'ar';
  const sections = [
    ['الفواتير الذكية', 'Smart Invoices', 'رفع وتصوير الفواتير، قراءة OCR، التحقق من إيصال البطاقة، الاعتماد والإرجاع، وحفظ المرفقات.', 'Upload or capture invoices, OCR extraction, card receipt validation, approval, return, and attachment storage.'],
    ['إدارة الأصول', 'Asset Management', 'طلبات النقل والفائض والإسقاط، وسجل حركات الأصل دون بيانات الشراء.', 'Transfer, surplus, and disposal requests with a movement history that excludes purchasing data.'],
    ['السلف', 'Advances', 'إنشاء سلف شهرية أو فعاليات، توزيعها على الحضانات، وحساب المصروف والمتبقي تلقائيًا.', 'Create monthly or event advances, allocate them to nurseries, and calculate spent and remaining balances automatically.'],
    ['التقارير', 'Reports', 'تقارير الفواتير والأصول والسلف والتقرير الشامل مع التصدير إلى Excel.', 'Invoice, asset, advance, and comprehensive reports with Excel export.'],
    ['الصلاحيات', 'Permissions', 'صلاحيات مخصصة لكل موظف إدارة، وحصر بيانات الحضانة في نطاقها فقط.', 'Custom administration permissions and nursery-level data isolation.'],
    ['سجل العمليات', 'Audit Log', 'تسجيل الدخول والاعتماد والرفض والإرجاع والنقل والإسقاط والتعديلات.', 'Tracks logins, approvals, rejections, returns, transfers, disposals, and updates.'],
    ['الذكاء التحليلي', 'Intelligence', 'توصيات تلقائية، اكتشاف تكرار الفواتير، تنبيهات السلف، ومساعد ذكي داخل النظام.', 'Automatic recommendations, duplicate invoice detection, advance alerts, and an in-system smart assistant.'],
    ['ربط Supabase', 'Supabase Connection', 'تسجيل دخول حقيقي، قاعدة بيانات مركزية، تخزين خاص للمرفقات، وسياسات حماية RLS.', 'Real authentication, centralized database, private attachment storage, and RLS protection.'],
  ];

  return (
    <section className="official-info-page">
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS Enterprise v2.0</span>
          <h1>{ar ? 'ما الجديد في الإصدار الرسمي؟' : "What's New in the Official Release?"}</h1>
          <p>{ar ? 'ملخص المزايا المعتمدة في النسخة الرسمية الأولى من المنظومة.' : 'A summary of the capabilities included in the first official release.'}</p>
        </div>
      </div>
      <div className="whats-new-grid">
        {sections.map(([arTitle,enTitle,arText,enText], index) => (
          <article key={arTitle}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{ar ? arTitle : enTitle}</h2>
              <p>{ar ? arText : enText}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
