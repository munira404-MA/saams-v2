export function dashboardAccess(profile) {
  const nursery = profile?.role === 'nursery';
  return page => profile?.role === 'super_admin' || (nursery
    ? ['assets','invoices','advances','reports','attachments','settings','help','about'].includes(page)
    : Boolean(profile?.permissions?.[page]));
}

export function activityPage(row) {
  const type = String(row.entityType || '');
  if (/^asset/.test(type)) return 'assets';
  if (/^invoice/.test(type)) return 'invoices';
  if (/^advance/.test(type)) return 'advances';
  if (/transport/.test(type)) return 'transport';
  return ({'الأصول':'assets','الفواتير':'invoices','السلف':'advances','مهام النقل':'transport'})[row.screen] || null;
}
