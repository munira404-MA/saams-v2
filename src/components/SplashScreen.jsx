import { useEffect } from 'react';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="saams-splash">
      <div className="saams-splash-card">
        <div className="saams-splash-logos">
          <img src="/academy-logo.png" alt="Sharjah Education Academy" />
          <span></span>
          <img src="/nurseries-logo.png" alt="Sharjah Nurseries" />
        </div>
        <div className="saams-splash-mark">SAAMS</div>
        <h1>منظومة الأصول والسلف الذكية</h1>
        <p>Smart Assets & Advances Management System</p>
        <div className="saams-splash-version">Official Release · Version 1.0</div>
        <div className="saams-splash-loader"><i></i></div>
      </div>
    </div>
  );
}
