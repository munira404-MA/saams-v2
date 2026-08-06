import { useState } from 'react';

export default function Help({ lang, setActive }) {
  const ar = lang === 'ar';
  const [openFaq, setOpenFaq] = useState(0);

  const guides = [
    {
      icon: '▤',
      titleAr: 'رفع ومراجعة الفواتير',
      titleEn: 'Upload and Review Invoices',
      textAr: 'اختاري رفع ملف أو التصوير من الجوال، حددي الحضانة والسلفة، راجعي البيانات المقروءة، ثم احفظي الفاتورة. عند الدفع بالبطاقة يجب إرفاق إيصال البطاقة.',
      textEn: 'Upload a file or take a mobile photo, select the nursery and advance, review the extracted data, then save. Card payments require a card receipt.',
      target: 'invoices',
    },
    {
      icon: '◇',
      titleAr: 'طلب نقل أو فائض أو إسقاط',
      titleEn: 'Transfer, Surplus, or Disposal',
      textAr: 'ابحثي برقم الباركود أو صوريه، وستظهر بيانات الأصل تلقائيًا. حددي سبب الطلب، والجهة المنقول إليها في طلب النقل فقط.',
      textEn: 'Search or scan the barcode to fill asset details automatically. Enter the reason and select the destination for transfer requests only.',
      target: 'assets',
    },
    {
      icon: '▥',
      titleAr: 'متابعة السلف',
      titleEn: 'Track Advances',
      textAr: 'تعرض شاشة السلف المبلغ المخصص والمصروف والمتبقي ونسبة الاستخدام لكل حضانة، مع فصل السلف الشهرية عن سلف الفعاليات.',
      textEn: 'The advances screen shows allocated, spent, remaining, and usage percentage for every nursery, including monthly and event advances.',
      target: 'advances',
    },
    {
      icon: '▦',
      titleAr: 'التقارير والتصدير',
      titleEn: 'Reports and Export',
      textAr: 'استخدمي التصفية حسب الحضانة والتاريخ والحالة، ثم صدّري التقرير إلى Excel أو احفظي المعاينة بصيغة PDF.',
      textEn: 'Filter by nursery, date, and status, then export to Excel or save the report preview as PDF.',
      target: 'reports',
    },
    {
      icon: '♙',
      titleAr: 'المستخدمون والصلاحيات',
      titleEn: 'Users and Permissions',
      textAr: 'يمكن لمدير النظام إنشاء حساب حضانة أو موظف إدارة، وتحديد الشاشات المسموح له باستخدامها وتفعيل الحساب أو إيقافه.',
      textEn: 'System administrators can create nursery or administration accounts, assign page permissions, and enable or disable access.',
      target: 'users',
    },
    {
      icon: '⚙',
      titleAr: 'الإعدادات والنسخ الاحتياطي',
      titleEn: 'Settings and Backup',
      textAr: 'تتضمن الإعدادات الحساب الشخصي، إدارة الحضانات، النسخ الاحتياطي، سجل العمليات، معلومات الإصدار، وحول المنظومة.',
      textEn: 'Settings include profile, nursery management, backup, audit log, version details, and about the system.',
      target: 'settings',
    },
  ];

  const faqs = [
    [
      'لماذا لا أستطيع اعتماد الفاتورة؟',
      'تأكدي من اكتمال الحقول الإلزامية، وربط الفاتورة بسلفة مفتوحة، وإرفاق إيصال البطاقة إذا كانت طريقة الدفع بطاقة.',
      'Why can’t I approve an invoice?',
      'Confirm all required fields are complete, the invoice is linked to an open advance, and a card receipt is attached when payment is by card.',
    ],
    [
      'هل يمكن رفع أكثر من فاتورة معًا؟',
      'نعم، يمكن رفع عدة ملفات أو ملف PDF متعدد الصفحات. يقوم النظام بفصل الفواتير والإيصالات وعرضها للمراجعة واحدة تلو الأخرى.',
      'Can multiple invoices be uploaded together?',
      'Yes. Upload several files or a multi-page PDF. The system separates invoices and receipts and presents them for review.',
    ],
    [
      'كيف أعرف المتبقي من سلفة الحضانة؟',
      'افتحي شاشة السلف، ثم اختاري السلفة والحضانة. سيظهر المخصص والمصروف والمتبقي مع شريط نسبة الاستخدام.',
      'How do I see the nursery advance balance?',
      'Open Advances and select the advance and nursery. Allocated, spent, remaining, and usage percentage will be shown.',
    ],
    [
      'أين أجد سجل حركة الأصل؟',
      'من شاشة الأصول اضغطي على اسم الأصل. سيظهر Timeline يوضح النقل والفائض والإسقاط والاعتمادات المرتبطة به.',
      'Where can I find an asset’s movement history?',
      'Click the asset name in Asset Management to view its timeline of transfers, surplus, disposal, and approvals.',
    ],
    [
      'كيف أحفظ التقرير PDF؟',
      'من شاشة التقارير اضغطي زر PDF، ثم اختاري Save as PDF من نافذة الطباعة.',
      'How do I save a report as PDF?',
      'Click PDF in Reports, then choose Save as PDF in the print dialog.',
    ],
  ];

  return (
    <section className="help-page official-info-page">
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS Enterprise Official Release 3.2</span>
          <h1>{ar ? 'مركز المساعدة' : 'Help Center'}</h1>
          <p>{ar ? 'دليل مختصر لاستخدام الشاشات والإجراءات الأساسية في المنظومة.' : 'A concise guide to the system screens and essential procedures.'}</p>
        </div>
      </div>

      <div className="help-guide-grid">
        {guides.map((guide) => (
          <article key={guide.target}>
            <span>{guide.icon}</span>
            <div>
              <h2>{ar ? guide.titleAr : guide.titleEn}</h2>
              <p>{ar ? guide.textAr : guide.textEn}</p>
              <button type="button" onClick={() => setActive?.(guide.target)}>
                {ar ? 'فتح الشاشة' : 'Open Screen'} ←
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="help-faq-card">
        <div className="help-section-heading">
          <div>
            <span>{ar ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</span>
            <h2>{ar ? 'إجابات سريعة' : 'Quick Answers'}</h2>
          </div>
        </div>
        <div className="help-faq-list">
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            return (
              <article className={open ? 'open' : ''} key={faq[0]}>
                <button type="button" onClick={() => setOpenFaq(open ? -1 : index)}>
                  <strong>{ar ? faq[0] : faq[2]}</strong>
                  <span>{open ? '−' : '+'}</span>
                </button>
                {open && <p>{ar ? faq[1] : faq[3]}</p>}
              </article>
            );
          })}
        </div>
      </div>

      <div className="help-support-card">
        <span>?</span>
        <div>
          <h2>{ar ? 'الدعم الفني' : 'Technical Support'}</h2>
          <p>{ar ? 'يمكن إضافة بيانات مسؤول الدعم الفني والبريد الإلكتروني ورقم التواصل لاحقًا من إعدادات النظام.' : 'Support contact details can be added later through system settings.'}</p>
        </div>
      </div>
    </section>
  );
}
