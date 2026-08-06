export default function AssetOfficialDocument({ request, ar, onClose }) {
  const isTransfer = request.type === 'transfer';
  const isSurplus = request.type === 'surplus';
  const title = isTransfer
    ? (ar ? 'محضر طلب نقل أصل' : 'Asset Transfer Request')
    : isSurplus
      ? (ar ? 'محضر طلب فائض' : 'Asset Surplus Request')
      : (ar ? 'محضر طلب إسقاط أصل' : 'Asset Disposal Request');

  const print = () => window.print();

  return (
    <div className="official-document-overlay" onClick={onClose}>
      <div className="official-document-modal" onClick={e=>e.stopPropagation()}>
        <div className="official-document-toolbar no-print">
          <button onClick={onClose}>×</button>
          <strong>{title}</strong>
          <button onClick={print}>⌘ {ar?'طباعة / حفظ PDF':'Print / Save PDF'}</button>
        </div>

        <article className="official-document-sheet">
          <header>
            <div className="official-document-logos">
              <img src="/academy-logo.png" alt="" />
              <img src="/nurseries-logo.png" alt="" />
            </div>
            <div>
              <small>SAAMS Enterprise Official Release 3.2</small>
              <h1>{title}</h1>
              <p>{ar?'منظومة الأصول والسلف الذكية':'Smart Assets & Advances Management System'}</p>
            </div>
          </header>

          <section className="official-document-meta">
            <div><span>{ar?'رقم الطلب':'Request No.'}</span><strong>{request.id}</strong></div>
            <div><span>{ar?'التاريخ':'Date'}</span><strong>{request.date || '—'}</strong></div>
            <div><span>{ar?'الحالة':'Status'}</span><strong>{request.status || '—'}</strong></div>
          </section>

          <section className="official-document-body">
            <h2>{ar?'بيانات الأصل':'Asset Details'}</h2>
            <div className="official-document-grid">
              <div><span>{ar?'اسم الأصل':'Asset Name'}</span><strong>{ar?request.assetAr:request.assetEn}</strong></div>
              <div><span>{ar?'رقم الباركود':'Barcode'}</span><strong>{request.barcode}</strong></div>
              <div><span>{ar?'من':'From'}</span><strong>{ar?request.fromAr:request.fromEn}</strong></div>
              {isTransfer&&<div><span>{ar?'إلى':'To'}</span><strong>{ar?request.toAr:request.toEn}</strong></div>}
              <div className="wide"><span>{ar?'السبب':'Reason'}</span><strong>{ar?request.reasonAr:request.reasonEn}</strong></div>
            </div>
          </section>

          <section className="official-document-approval">
            <div><span>{ar?'إعداد الطلب':'Prepared By'}</span><strong></strong><small>{ar?'الاسم والتوقيع':'Name & Signature'}</small></div>
            <div><span>{ar?'اعتماد الإدارة':'Administration Approval'}</span><strong></strong><small>{ar?'الاسم والتوقيع':'Name & Signature'}</small></div>
            <div><span>{ar?'الاستلام / التنفيذ':'Receipt / Execution'}</span><strong></strong><small>{ar?'الاسم والتوقيع':'Name & Signature'}</small></div>
          </section>

          <footer>
            <span>{ar?'تم إنشاء هذا المستند إلكترونيًا من منظومة SAAMS.':'This document was generated electronically by SAAMS.'}</span>
            <strong>{request.id}</strong>
          </footer>
        </article>
      </div>
    </div>
  );
}
