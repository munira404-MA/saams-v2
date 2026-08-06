import { useEffect } from 'react';

export default function SplashScreen({ lang, onDone }) {
  const ar = lang === 'ar';

  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="saams-splash">
      <div className="saams-splash-card">
        <div className="saams-splash-logos">
          <img src="/academy-logo.png" alt={ar ? 'أكاديمية الشارقة للتعليم' : 'Sharjah Education Academy'} />
          <span></span>
          <img src="/nurseries-logo.png" alt={ar ? 'حضانات الشارقة' : 'Sharjah Nurseries'} />
        </div>
        <div className="saams-splash-mark">SAAMS</div>
        <h1>{ar ? 'منظومة الأصول والسلف الذكية' : 'SAAMS Enterprise'}</h1>
        <p>{ar ? 'نظام إدارة الأصول والسلف والعمليات المالية' : 'Assets, Advances & Financial Operations Management System'}</p>
        <div className="saams-splash-version">{ar ? 'الإصدار الرسمي 3.2' : 'Official Release · Version 3.2'}</div>
        <div className="saams-splash-loader"><i></i></div>
      </div>
    </div>
  );
}
