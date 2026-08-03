import { useEffect, useMemo, useState } from 'react';

const translations = {
  ar: {
    greeting: 'مرحباً منيرة',
    intro: 'مرحباً بكِ في منظومة الأصول والسلف الذكية',
    filter: 'تصفية حسب',
    today: 'الاثنين، 3 أغسطس 2026',
    totalAssets: 'إجمالي الأصول',
    assetValue: 'قيمة الأصول',
    openAdvances: 'السلف المفتوحة',
    pendingInvoices: 'الفواتير قيد الاعتماد',
    lateInvoices: 'الفواتير المتأخرة',
    asset: 'أصل',
    million: 'مليون درهم',
    advance: 'سلفة',
    invoice: 'فاتورة',
    monthChange: 'من الشهر الماضي',
    newThisMonth: 'جديدة هذا الشهر',
    awaitingReview: 'بانتظار المراجعة',
    olderWeek: 'أكثر من أسبوع',
    invoiceStatus: 'حالة الفواتير',
    assetByNursery: 'قيمة الأصول حسب الحضانة',
    thisMonth: 'هذا الشهر',
    totalInvoices: 'إجمالي الفواتير: 34',
    approved: 'معتمدة',
    review: 'قيد المراجعة',
    returned: 'معادة للحضانة',
    late: 'متأخرة',
    alerts: 'التنبيهات',
    viewAll: 'عرض الكل',
    quickActions: 'العمليات السريعة',
    todayActivity: 'نشاط اليوم',
    activity: 'النشاط',
    details: 'التفاصيل',
    user: 'المستخدم',
    time: 'الوقت',
    addAsset: 'أصل جديد',
    addInvoice: 'فاتورة جديدة',
    addAdvance: 'سلفة جديدة',
    transferAsset: 'نقل أصل',
    addUser: 'مستخدم جديد',
    report: 'تقرير',
    alert1: 'حضانة اللؤلؤية لم تسلم فواتير يوليو',
    alert2: 'يوجد أصلان بانتظار النقل من حضانة واسط 2',
    alert3: 'الفاتورة INV-2026-124 بانتظار الموافقة',
    alert4: 'تمت الموافقة على سلفة حضانة البديع',
    approvedInvoice: 'تم اعتماد فاتورة',
    assetAdded: 'تم إضافة أصل جديد',
    assetMoved: 'تم نقل أصل',
    advanceCreated: 'تم إنشاء سلفة',
    invoiceReturned: 'تم رفض فاتورة',
    amountAssets: '156 أصل مسجل',
  },
  en: {
    greeting: 'Welcome, Munira',
    intro: 'Welcome to the Smart Assets & Advances Management System',
    filter: 'Filter by',
    today: 'Monday, 3 August 2026',
    totalAssets: 'Total Assets',
    assetValue: 'Asset Value',
    openAdvances: 'Open Advances',
    pendingInvoices: 'Invoices Pending Approval',
    lateInvoices: 'Late Invoices',
    asset: 'Assets',
    million: 'AED Million',
    advance: 'Advances',
    invoice: 'Invoices',
    monthChange: 'from last month',
    newThisMonth: 'new this month',
    awaitingReview: 'awaiting review',
    olderWeek: 'older than one week',
    invoiceStatus: 'Invoice Status',
    assetByNursery: 'Asset Value by Nursery',
    thisMonth: 'This Month',
    totalInvoices: 'Total invoices: 34',
    approved: 'Approved',
    review: 'Under Review',
    returned: 'Returned',
    late: 'Late',
    alerts: 'Alerts',
    viewAll: 'View All',
    quickActions: 'Quick Actions',
    todayActivity: 'Today’s Activity',
    activity: 'Activity',
    details: 'Details',
    user: 'User',
    time: 'Time',
    addAsset: 'New Asset',
    addInvoice: 'New Invoice',
    addAdvance: 'New Advance',
    transferAsset: 'Transfer Asset',
    addUser: 'New User',
    report: 'Report',
    alert1: 'Al Luluyah Nursery has not submitted July invoices',
    alert2: 'Two assets are awaiting transfer from Wasit 2 Nursery',
    alert3: 'Invoice INV-2026-124 is awaiting approval',
    alert4: 'Al Badie Nursery advance was approved',
    approvedInvoice: 'Invoice approved',
    assetAdded: 'New asset added',
    assetMoved: 'Asset transferred',
    advanceCreated: 'Advance created',
    invoiceReturned: 'Invoice returned',
    amountAssets: '156 registered assets',
  },
};

function AnimatedNumber({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 760;
    const start = performance.now();
    let frame;

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return decimals ? display.toFixed(decimals) : Math.round(display).toLocaleString();
}

function StatusDonut({ t }) {
  return (
    <div className="donut-wrap">
      <div className="donut-chart">
        <div className="donut-center">
          <strong>34</strong>
          <span>{t.invoice}</span>
        </div>
      </div>
      <div className="donut-legend">
        <span><i className="legend approved" />{t.approved}<b>42%</b></span>
        <span><i className="legend review" />{t.review}<b>28%</b></span>
        <span><i className="legend returned" />{t.returned}<b>18%</b></span>
        <span><i className="legend late" />{t.late}<b>12%</b></span>
      </div>
    </div>
  );
}

function AssetBars({ ar }) {
  const data = ar
    ? [
        ['اللؤلؤية', 92],
        ['الرحمانية', 78],
        ['واسط 2', 65],
        ['البديع', 54],
        ['القليعة', 42],
        ['السيوح', 33],
      ]
    : [
        ['Al Luluyah', 92],
        ['Al Rahmaniya', 78],
        ['Wasit 2', 65],
        ['Al Badie', 54],
        ['Al Qulaya', 42],
        ['Al Suyoh', 33],
      ];

  return (
    <div className="asset-bars" aria-label="Asset value chart">
      {data.map(([name, height], index) => (
        <div className="bar-item" key={name}>
          <div className="bar-value">{(2.35 - index * 0.27).toFixed(2)}</div>
          <div className="bar-track">
            <span style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
          </div>
          <small>{name}</small>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ lang }) {
  const ar = lang === 'ar';
  const t = translations[lang] || translations.ar;

  const cards = useMemo(
    () => [
      { label: t.totalAssets, value: 156, suffix: t.asset, icon: '◇', tone: 'violet', note: `+12 ${t.newThisMonth}` },
      { label: t.assetValue, value: 18.45, decimals: 2, suffix: t.million, icon: '◉', tone: 'teal', note: `+3.2% ${t.monthChange}` },
      { label: t.openAdvances, value: 12, suffix: t.advance, icon: '▣', tone: 'blue', note: `+3 ${t.newThisMonth}` },
      { label: t.pendingInvoices, value: 6, suffix: t.invoice, icon: '▤', tone: 'green', note: `4 ${t.awaitingReview}` },
      { label: t.lateInvoices, value: 3, suffix: t.invoice, icon: '◷', tone: 'orange', note: `2 ${t.olderWeek}` },
    ],
    [t],
  );

  const alerts = [
    { text: t.alert1, time: ar ? 'منذ ساعتين' : '2 hours ago', tone: 'red', icon: '!' },
    { text: t.alert2, time: ar ? 'منذ 5 ساعات' : '5 hours ago', tone: 'amber', icon: '◇' },
    { text: t.alert3, time: ar ? 'منذ 8 ساعات' : '8 hours ago', tone: 'blue', icon: '▤' },
    { text: t.alert4, time: ar ? 'منذ يوم' : '1 day ago', tone: 'green', icon: '✓' },
  ];

  const activities = [
    [t.approvedInvoice, '#INV-2026-122', ar ? 'لقاء طلعت' : 'Leqaa Talaat', '09:30'],
    [t.assetAdded, ar ? 'جهاز كمبيوتر HP' : 'HP Computer', ar ? 'منيرة الأحمد' : 'Munira Alahmed', '10:15'],
    [t.assetMoved, ar ? 'طاولة اجتماعات' : 'Meeting Table', ar ? 'محمد سليم' : 'Mohammed Salim', '11:02'],
    [t.advanceCreated, ar ? 'سلفة نشاط تخرج 2026' : 'Graduation Advance 2026', ar ? 'منيرة الأحمد' : 'Munira Alahmed', '12:45'],
    [t.invoiceReturned, '#INV-2026-120', ar ? 'لقاء طلعت' : 'Leqaa Talaat', '01:30'],
  ];

  return (
    <div className="glass-dashboard">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">SAAMS v2.7</span>
          <h1>{t.greeting} <span className="wave">👋</span></h1>
          <p>{t.intro}</p>
        </div>
        <div className="dashboard-filters">
          <button type="button">☷ {t.filter}</button>
          <button type="button">▣ {t.today}</button>
        </div>
      </section>

      <section className="stat-grid">
        {cards.map((card, index) => (
          <article className={`stat-card ${card.tone}`} key={card.label} style={{ animationDelay: `${index * 70}ms` }}>
            <div className="stat-icon">{card.icon}</div>
            <span>{card.label}</span>
            <strong><AnimatedNumber value={card.value} decimals={card.decimals || 0} /></strong>
            <em>{card.suffix}</em>
            <footer>↗ {card.note}</footer>
          </article>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid-top">
        <article className="glass-panel alerts-panel">
          <div className="panel-heading">
            <h2>♧ {t.alerts}</h2>
            <button type="button">{t.viewAll}</button>
          </div>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div className={`alert-item ${alert.tone}`} key={alert.text}>
                <span className="alert-symbol">{alert.icon}</span>
                <div><strong>{alert.text}</strong><small>{alert.time}</small></div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-panel chart-panel">
          <div className="panel-heading">
            <h2>{t.assetByNursery}</h2>
            <button type="button">{t.thisMonth}⌄</button>
          </div>
          <AssetBars ar={ar} />
        </article>

        <article className="glass-panel status-panel">
          <div className="panel-heading">
            <h2>{t.invoiceStatus}</h2>
            <button type="button">{t.thisMonth}⌄</button>
          </div>
          <StatusDonut t={t} />
          <p className="panel-total">{t.totalInvoices}</p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="glass-panel quick-panel">
          <div className="panel-heading">
            <h2>ϟ {t.quickActions}</h2>
          </div>
          <div className="quick-grid">
            {[
              ['◇', t.addAsset, 'teal'],
              ['▤', t.addInvoice, 'green'],
              ['▣', t.addAdvance, 'blue'],
              ['⇄', t.transferAsset, 'orange'],
              ['♙', t.addUser, 'sky'],
              ['▥', t.report, 'violet'],
            ].map(([icon, label, tone]) => (
              <button className={`quick-action ${tone}`} type="button" key={label}>
                <span>{icon}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="glass-panel activity-panel">
          <div className="panel-heading">
            <h2>◷ {t.todayActivity}</h2>
            <button type="button">{t.viewAll}</button>
          </div>
          <div className="activity-table">
            <div className="activity-row activity-head">
              <span>{t.activity}</span>
              <span>{t.details}</span>
              <span>{t.user}</span>
              <span>{t.time}</span>
            </div>
            {activities.map(([activity, details, user, time], index) => (
              <div className="activity-row" key={`${activity}-${time}`}>
                <span><i className={`activity-dot dot-${index}`} />{activity}</span>
                <span>{details}</span>
                <span>{user}</span>
                <span>{time}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>SAAMS v2.7</span>
        <p>{ar ? '© 2026 أكاديمية الشارقة للتعليم — جميع الحقوق محفوظة' : '© 2026 Sharjah Education Academy — All rights reserved'}</p>
      </footer>
    </div>
  );
}
