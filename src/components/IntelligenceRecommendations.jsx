import { useMemo, useState } from 'react';
import { buildRecommendations } from '../utils/intelligence';

export default function IntelligenceRecommendations({ lang, onNavigate }) {
  const ar = lang === 'ar';
  const [refreshToken, setRefreshToken] = useState(0);
  const rows = useMemo(() => buildRecommendations(), [refreshToken]);

  return (
    <article className="intelligence-card">
      <div className="intelligence-card-head">
        <div>
          <span className="intelligence-spark">✦</span>
          <div>
            <h2>{ar ? 'توصيات النظام' : 'System Recommendations'}</h2>
            <p>{ar ? 'تحليل تلقائي للتكرار والتأخير والاستهلاك والحركات غير المعتادة.' : 'Automatic analysis of duplicates, delays, usage, and unusual activity.'}</p>
          </div>
        </div>
        <button type="button" onClick={() => setRefreshToken((value) => value + 1)}>↻ {ar ? 'تحديث التحليل' : 'Refresh Analysis'}</button>
      </div>

      <div className="intelligence-list">
        {rows.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`intelligence-item ${item.severity}`}
            onClick={() => onNavigate?.(item.target)}
          >
            <span className="intelligence-icon">{item.icon}</span>
            <div>
              <strong>{ar ? item.titleAr : item.titleEn}</strong>
              <p>{ar ? item.textAr : item.textEn}</p>
            </div>
            <b>‹</b>
          </button>
        ))}
      </div>
    </article>
  );
}
