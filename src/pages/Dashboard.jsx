import { useEffect, useMemo, useState } from 'react';

const translations = {
  ar: {
    greeting: 'مرحباً منيرة',
    intro: 'مرحباً بكِ في منظومة الأصول والسلف الذكية',
    filter: 'تصفية حسب',
    today: 'الاثنين، 3 أغسطس 2026',
    totalAssets: 'إجمالي الأصول',
    openAdvances: 'السلف المفتوحة',
    pendingInvoices: 'الفواتير قيد الاعتماد',
    lateInvoices: 'الفواتير المتأخرة',
    asset: 'أصل',
    advance: 'سلفة',
    invoice: 'فاتورة',
    monthChange: 'من الشهر الماضي',
    newThisMonth: 'جديدة هذا الشهر',
    awaitingReview: 'بانتظار المراجعة',
    olderWeek: 'أكثر من أسبوع',
    invoiceStatus: 'حالة الفواتير',
    assetByNursery: 'توزيع الأصول حسب الحضانة',
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
    openAdvances: 'Open Advances',
    pendingInvoices: 'Invoices Pending Approval',
    lateInvoices: 'Late Invoices',
    asset: 'Assets',
    advance: 'Advances',
    invoice: 'Invoices',
    monthChange: 'from last month',
    newThisMonth: 'new this month',
    awaitingReview: 'awaiting review',
    olderWeek: 'older than one week',
    invoiceStatus: 'Invoice Status',
    assetByNursery: 'Assets by Nursery',
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

function StatusDonut({ t, total = 34, nursery = false }) {
  const segments = nursery ? [50, 25, 25, 0] : [42, 28, 18, 12];
  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={nursery ? { background: 'conic-gradient(#15b3a6 0 50%, #3d73e8 50% 75%, #ff922b 75% 100%, #f34d68 100% 100%)' } : undefined}>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>{t.invoice}</span>
        </div>
      </div>
      <div className="donut-legend">
        <span><i className="legend approved" />{t.approved}<b>{segments[0]}%</b></span>
        <span><i className="legend review" />{t.review}<b>{segments[1]}%</b></span>
        <span><i className="legend returned" />{t.returned}<b>{segments[2]}%</b></span>
        <span><i className="legend late" />{t.late}<b>{segments[3]}%</b></span>
      </div>
    </div>
  );
}

function AssetBars({ ar, nursery = false, nurseryName = '' }) {
  const data = nursery
    ? [[nurseryName || (ar ? 'الحضانة' : 'Nursery'), 72]]
    : ar
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
          <div className="bar-value">{nursery ? 5 : [31,27,23,19,16,12][index]}</div>
          <div className="bar-track">
            <span style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
          </div>
          <small>{name}</small>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ lang, setActive, profile }) {
  const ar = lang === 'ar';
  const t = translations[lang] || translations.ar;
  const isNursery = profile?.role === 'nursery';
  const nurseryName = profile?.nursery || (ar ? 'الحضانة' : 'Nursery');
  const displayName = profile?.full_name || (ar ? 'المستخدم' : 'User');
  const scopedT = isNursery ? { ...t, greeting: ar ? `مرحباً ${displayName}` : `Welcome, ${displayName}`, intro: ar ? `ملخص بيانات ${nurseryName} فقط` : `Summary for ${nurseryName} only`, assetByNursery: ar ? `أصول ${nurseryName}` : `${nurseryName} Assets`, totalInvoices: ar ? 'إجمالي فواتير الحضانة: 4' : 'Nursery invoices: 4' } : t;

  const cards = useMemo(
    () => isNursery ? [
      { label: scopedT.totalAssets, value: 5, suffix: scopedT.asset, icon: '◇', tone: 'violet', note: ar ? 'أصول الحضانة فقط' : 'Nursery assets only' },
      { label: scopedT.openAdvances, value: 2, suffix: scopedT.advance, icon: '▣', tone: 'blue', note: ar ? 'سلف الحضانة المفتوحة' : 'Open nursery advances' },
      { label: scopedT.pendingInvoices, value: 1, suffix: scopedT.invoice, icon: '▤', tone: 'green', note: ar ? 'بانتظار مراجعة الإدارة' : 'Awaiting administration review' },
      { label: scopedT.lateInvoices, value: 0, suffix: scopedT.invoice, icon: '◷', tone: 'orange', note: ar ? 'لا توجد فواتير متأخرة' : 'No late invoices' },
    ] : [
      { label: scopedT.totalAssets, value: 156, suffix: scopedT.asset, icon: '◇', tone: 'violet', note: `+12 ${scopedT.newThisMonth}` },
      { label: scopedT.openAdvances, value: 12, suffix: scopedT.advance, icon: '▣', tone: 'blue', note: `+3 ${scopedT.newThisMonth}` },
      { label: scopedT.pendingInvoices, value: 6, suffix: scopedT.invoice, icon: '▤', tone: 'green', note: `4 ${scopedT.awaitingReview}` },
      { label: scopedT.lateInvoices, value: 3, suffix: scopedT.invoice, icon: '◷', tone: 'orange', note: `2 ${scopedT.olderWeek}` },
    ],
    [scopedT, isNursery, ar],
  );

  const alerts = isNursery ? [
    { text: ar ? 'لديك فاتورة واحدة بانتظار مراجعة الإدارة' : 'You have one invoice awaiting administration review', time: ar ? 'منذ 8 ساعات' : '8 hours ago', tone: 'blue', icon: '▤' },
    { text: ar ? 'يوجد طلب نقل أصل واحد قيد الاعتماد' : 'One asset transfer request is pending approval', time: ar ? 'منذ 5 ساعات' : '5 hours ago', tone: 'amber', icon: '◇' },
    { text: ar ? 'تمت الموافقة على سلفة الحضانة' : 'The nursery advance was approved', time: ar ? 'منذ يوم' : '1 day ago', tone: 'green', icon: '✓' },
  ] : [
    { text: scopedT.alert1, time: ar ? 'منذ ساعتين' : '2 hours ago', tone: 'red', icon: '!' },
    { text: scopedT.alert2, time: ar ? 'منذ 5 ساعات' : '5 hours ago', tone: 'amber', icon: '◇' },
    { text: scopedT.alert3, time: ar ? 'منذ 8 ساعات' : '8 hours ago', tone: 'blue', icon: '▤' },
    { text: scopedT.alert4, time: ar ? 'منذ يوم' : '1 day ago', tone: 'green', icon: '✓' },
  ];

  const activities = isNursery ? [
    [ar ? 'تم رفع فاتورة' : 'Invoice uploaded', '#INV-2026-124', displayName, '09:30'],
    [ar ? 'تم تقديم طلب نقل أصل' : 'Asset transfer request submitted', ar ? 'خزانة تخزين خشبية' : 'Wooden storage cabinet', displayName, '10:15'],
    [ar ? 'تم فتح سلفة جديدة' : 'New advance opened', ar ? 'سلفة أغسطس وسبتمبر 2026' : 'August and September 2026 advance', ar ? 'الإدارة' : 'Administration', '12:45'],
  ] : [
    [scopedT.approvedInvoice, '#INV-2026-122', ar ? 'لقاء طلعت' : 'Leqaa Talaat', '09:30'],
    [scopedT.assetAdded, ar ? 'جهاز كمبيوتر HP' : 'HP Computer', ar ? 'منيرة الأحمد' : 'Munira Alahmed', '10:15'],
    [scopedT.assetMoved, ar ? 'طاولة اجتماعات' : 'Meeting Table', ar ? 'محمد سليم' : 'Mohammed Salim', '11:02'],
    [scopedT.advanceCreated, ar ? 'سلفة نشاط تخرج 2026' : 'Graduation Advance 2026', ar ? 'منيرة الأحمد' : 'Munira Alahmed', '12:45'],
    [scopedT.invoiceReturned, '#INV-2026-120', ar ? 'لقاء طلعت' : 'Leqaa Talaat', '01:30'],
  ];

  return (
    <div className="glass-dashboard">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">SAAMS v3.0</span>
          <h1>{scopedT.greeting} <span className="wave">👋</span></h1>
          <p>{scopedT.intro}</p>
        </div>
        <div className="dashboard-filters">
          <button type="button">☷ {scopedT.filter}</button>
          <button type="button">▣ {scopedT.today}</button>
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
            <h2>♧ {scopedT.alerts}</h2>
            <button type="button">{scopedT.viewAll}</button>
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
            <h2>{scopedT.assetByNursery}</h2>
            <button type="button">{scopedT.thisMonth}⌄</button>
          </div>
          <AssetBars ar={ar} nursery={isNursery} nurseryName={nurseryName} />
        </article>

        <article className="glass-panel status-panel">
          <div className="panel-heading">
            <h2>{scopedT.invoiceStatus}</h2>
            <button type="button">{scopedT.thisMonth}⌄</button>
          </div>
          <StatusDonut t={scopedT} total={isNursery ? 4 : 34} nursery={isNursery} />
          <p className="panel-total">{scopedT.totalInvoices}</p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="glass-panel quick-panel">
          <div className="panel-heading">
            <h2>ϟ {scopedT.quickActions}</h2>
          </div>
          <div className="quick-grid">
            {(isNursery ? [
              ['▤', scopedT.addInvoice, 'green', 'invoices'],
              ['⇄', scopedT.transferAsset, 'orange', 'assets'],
              ['▣', scopedT.openAdvances, 'blue', 'advances'],
              ['▥', scopedT.report, 'violet', 'reports'],
            ] : [
              ['◇', scopedT.addAsset, 'teal', 'assets'],
              ['▤', scopedT.addInvoice, 'green', 'invoices'],
              ['▣', scopedT.addAdvance, 'blue', 'advances'],
              ['⇄', scopedT.transferAsset, 'orange', 'assets'],
              ['♙', scopedT.addUser, 'sky', 'users'],
              ['▥', scopedT.report, 'violet', 'reports'],
            ]).map(([icon, label, tone, target]) => (
              <button className={`quick-action ${tone}`} type="button" key={label} onClick={() => setActive(target)}>
                <span>{icon}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="glass-panel activity-panel">
          <div className="panel-heading">
            <h2>◷ {scopedT.todayActivity}</h2>
            <button type="button">{scopedT.viewAll}</button>
          </div>
          <div className="activity-table">
            <div className="activity-row activity-head">
              <span>{scopedT.activity}</span>
              <span>{scopedT.details}</span>
              <span>{scopedT.user}</span>
              <span>{scopedT.time}</span>
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
        <span>SAAMS v3.0</span>
        <p>{ar ? '© 2026 أكاديمية الشارقة للتعليم — جميع الحقوق محفوظة' : '© 2026 Sharjah Education Academy — All rights reserved'}</p>
      </footer>
    </div>
  );
}
