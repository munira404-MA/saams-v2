import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

const STATUS = {
  awaiting_pickup: { ar: 'بانتظار الاستلام للنقل', en: 'Awaiting Pickup' },
  in_transit: { ar: 'قيد النقل', en: 'In Transit' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
};

function norm(value) {
  return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

function requestLabel(row, ar) {
  return ar ? (row.asset_name_ar || row.asset_name_en || '') : (row.asset_name_en || row.asset_name_ar || '');
}

export default function TransportTasks({ lang, profile }) {
  const ar = lang === 'ar';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [scanValues, setScanValues] = useState({});
  const [filter, setFilter] = useState('active');
  const [message, setMessage] = useState('');

  async function loadTasks() {
    try {
      const { data, error } = await supabase
        .from('asset_requests')
        .select('*')
        .eq('request_type', 'transfer')
        .in('status', ['approved', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (e) {
      console.error('Transport tasks load failed', e);
      setMessage(ar ? 'تعذر تحميل مهام النقل. تأكدي من تشغيل ملف SQL الخاص بمسار النقل.' : 'Could not load transport tasks. Run the transport workflow SQL file.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    const timer = setInterval(loadTasks, 10000);
    const onSync = () => loadTasks();
    window.addEventListener('focus', onSync);
    window.addEventListener('saams:data-changed', onSync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onSync);
      window.removeEventListener('saams:data-changed', onSync);
    };
  }, []);

  const visible = useMemo(() => tasks.filter((row) => {
    const s = row.transport_status || 'awaiting_pickup';
    if (filter === 'all') return true;
    if (filter === 'done') return s === 'delivered' || row.status === 'completed';
    return s !== 'delivered' && row.status !== 'completed';
  }), [tasks, filter]);

  const awaiting = tasks.filter((r) => (r.transport_status || 'awaiting_pickup') === 'awaiting_pickup' && r.status === 'approved').length;
  const moving = tasks.filter((r) => r.transport_status === 'in_transit').length;
  const overdue = tasks.filter((r) => r.transport_status === 'in_transit' && r.pickup_at && Date.now() - new Date(r.pickup_at).getTime() > 86400000).length;

  function barcodeMatches(row) {
    const value = norm(scanValues[row.id]);
    return value && (value === norm(row.barcode) || value === norm(row.central_finance_barcode));
  }

  async function markPickedUp(row) {
    if (!barcodeMatches(row)) {
      setMessage(ar ? 'امسحي أو اكتبي أحد باركودي الأصل الصحيحين قبل تأكيد الاستلام.' : 'Scan or enter either valid asset barcode before confirming pickup.');
      return;
    }
    setWorking(row.id);
    setMessage('');
    try {
      const { error } = await supabase.from('asset_requests').update({
        transport_status: 'in_transit',
        pickup_at: new Date().toISOString(),
        picked_up_by: profile?.id || null,
      }).eq('id', row.id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('saams:data-changed', { detail: { entity: 'asset_request', action: 'pickup' } }));
      await loadTasks();
      setMessage(ar ? 'تم تسجيل استلام الأصل للنقل.' : 'Asset pickup recorded.');
    } catch (e) {
      console.error(e);
      setMessage(ar ? 'تعذر تسجيل الاستلام.' : 'Could not record pickup.');
    } finally {
      setWorking('');
    }
  }

  async function resolveDestinationNurseryId(row) {
    const dest = String(row.to_name_ar || row.to_name_en || '').trim();
    if (!dest || ['المخزن', 'المبنى الرئيسي', 'Warehouse', 'Head Office'].includes(dest)) return null;
    const { data, error } = await supabase.from('nurseries').select('id,name_ar,name_en').eq('active', true);
    if (error) throw error;
    const match = (data || []).find((n) => String(n.name_ar || '').trim() === dest || String(n.name_en || '').trim() === dest);
    return match?.id || null;
  }

  async function markDelivered(row) {
    if (!barcodeMatches(row)) {
      setMessage(ar ? 'امسحي أو اكتبي أحد باركودي الأصل الصحيحين قبل تأكيد التسليم.' : 'Scan or enter either valid asset barcode before confirming delivery.');
      return;
    }
    setWorking(row.id);
    setMessage('');
    try {
      const destination = String(row.to_name_ar || row.to_name_en || '').trim();
      const nurseryId = await resolveDestinationNurseryId(row);
      const locationType = destination === 'المخزن' || destination === 'Warehouse' ? 'warehouse' : destination === 'المبنى الرئيسي' || destination === 'Head Office' ? 'head_office' : 'nursery';

      if (row.asset_id) {
        const assetUpdate = nurseryId
          ? { nursery_id: nurseryId, location_type: 'nursery', location_name_ar: null, location_name_en: null }
          : { nursery_id: null, location_type: locationType, location_name_ar: destination, location_name_en: destination };
        const { error: assetError } = await supabase.from('assets').update(assetUpdate).eq('id', row.asset_id);
        if (assetError) throw assetError;
      }

      const { error } = await supabase.from('asset_requests').update({
        status: 'completed',
        transport_status: 'delivered',
        delivered_at: new Date().toISOString(),
        delivered_by: profile?.id || null,
      }).eq('id', row.id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('saams:data-changed', { detail: { entity: 'asset_request', action: 'delivered' } }));
      window.dispatchEvent(new CustomEvent('saams:data-updated', { detail: { table: 'assets' } }));
      await loadTasks();
      setMessage(ar ? 'تم تسجيل التسليم وتحديث موقع الأصل تلقائيًا.' : 'Delivery recorded and asset location updated automatically.');
    } catch (e) {
      console.error(e);
      setMessage(ar ? 'تعذر إكمال التسليم أو تحديث موقع الأصل.' : 'Could not complete delivery or update asset location.');
    } finally {
      setWorking('');
    }
  }

  return <section className="transport-page">
    <div className="module-heading"><div><span className="eyebrow">SAAMS TRANSPORT</span><h1>{ar ? 'مهام النقل' : 'Transport Tasks'}</h1><p>{ar ? 'تنفيذ طلبات النقل المعتمدة وتحديث موقع الأصل تلقائيًا بعد التسليم.' : 'Execute approved transfer requests and update asset locations automatically after delivery.'}</p></div></div>

    <div className="asset-stat-grid transport-stats">
      <article><span>⌛</span><div><small>{ar ? 'بانتظار الاستلام' : 'Awaiting pickup'}</small><strong>{awaiting}</strong></div></article>
      <article><span>⇄</span><div><small>{ar ? 'قيد النقل' : 'In transit'}</small><strong>{moving}</strong></div></article>
      <article><span>!</span><div><small>{ar ? 'أكثر من 24 ساعة' : 'Over 24 hours'}</small><strong>{overdue}</strong></div></article>
    </div>

    {message && <div className="transport-message">{message}</div>}

    <div className="transport-toolbar">
      <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>{ar ? 'المهام الحالية' : 'Active Tasks'}</button>
      <button className={filter === 'done' ? 'active' : ''} onClick={() => setFilter('done')}>{ar ? 'المكتملة' : 'Completed'}</button>
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{ar ? 'الكل' : 'All'}</button>
      <button onClick={loadTasks}>{ar ? 'تحديث' : 'Refresh'}</button>
    </div>

    <div className="transport-task-list">
      {loading ? <div className="empty-state">{ar ? 'جاري تحميل مهام النقل...' : 'Loading transport tasks...'}</div> : visible.length === 0 ? <div className="empty-state">{ar ? 'لا توجد مهام نقل حالية.' : 'No transport tasks.'}</div> : visible.map((row) => {
        const s = row.transport_status || 'awaiting_pickup';
        const done = s === 'delivered' || row.status === 'completed';
        return <article className="transport-task-card" key={row.id}>
          <header><div><small>{row.request_code}</small><h3>{requestLabel(row, ar)}</h3></div><span className={`transport-status ${s}`}>{(STATUS[s] || STATUS.awaiting_pickup)[ar ? 'ar' : 'en']}</span></header>
          <div className="transport-task-grid">
            <div><small>{ar ? 'الباركود الداخلي' : 'Internal Barcode'}</small><strong>{row.barcode || '—'}</strong></div>
            <div><small>{ar ? 'باركود المالية' : 'Central Finance Barcode'}</small><strong>{row.central_finance_barcode || '—'}</strong></div>
            <div><small>{ar ? 'من' : 'From'}</small><strong>{ar ? row.from_name_ar : (row.from_name_en || row.from_name_ar)}</strong></div>
            <div><small>{ar ? 'إلى' : 'To'}</small><strong>{ar ? row.to_name_ar : (row.to_name_en || row.to_name_ar)}</strong></div>
          </div>
          {!done && <div className="transport-scan-row">
            <input value={scanValues[row.id] || ''} onChange={(e) => setScanValues((m) => ({ ...m, [row.id]: e.target.value }))} placeholder={ar ? 'امسحي أو اكتبي أي باركود للأصل' : 'Scan or enter either asset barcode'} />
            {s === 'awaiting_pickup' && <button disabled={working === row.id} onClick={() => markPickedUp(row)}>{ar ? 'تم الاستلام للنقل' : 'Picked Up'}</button>}
            {s === 'in_transit' && <button disabled={working === row.id} onClick={() => markDelivered(row)}>{ar ? 'تم التسليم' : 'Delivered'}</button>}
          </div>}
          {done && <footer>{ar ? 'تم إغلاق المهمة وتحديث موقع الأصل.' : 'Task closed and asset location updated.'}</footer>}
        </article>;
      })}
    </div>
  </section>;
}
