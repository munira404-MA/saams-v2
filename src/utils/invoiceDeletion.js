// UI guidance only; the database repeats these checks (SQL 25).
// Nursery: may delete ANY of its own invoices except approved ones (returned, rejected, under review, any advance state).
export function canDeleteInvoice(profile, invoice) {
  if (!profile || profile.active === false || !invoice) return false;
  if (profile.role === 'super_admin') return true;
  if (profile.role === 'admin') return profile.permissions?.invoices === true;
  if (profile.role !== 'nursery' || !profile.nursery_id || invoice.nurseryId !== profile.nursery_id) return false;
  return invoice.status !== 'approved';
}

// Why the delete button is disabled (shown as the button tooltip and under it).
export function deleteBlockedReason(profile, invoice, ar = true) {
  if (canDeleteInvoice(profile, invoice)) return '';
  if (invoice?.status === 'approved') return ar ? 'الفاتورة معتمدة — الحذف من الإدارة فقط' : 'Approved — only the administration can delete';
  if (profile?.role === 'nursery' && invoice?.nurseryId !== profile?.nursery_id) return ar ? 'الفاتورة ليست مسجلة على حضانتكم' : 'Not your nursery\'s invoice';
  return ar ? 'ليس لديك صلاحية حذف الفواتير' : 'No permission to delete invoices';
}

// Invoice date can be corrected by: system administrator / invoices admin always;
// nursery on its own invoices while under review or returned (not after approval).
export function canEditInvoiceDate(profile, invoice) {
  if (!profile || profile.active === false || !invoice) return false;
  if (profile.role === 'super_admin') return true;
  if (profile.role === 'admin') return profile.permissions?.invoices === true;
  if (profile.role !== 'nursery' || !profile.nursery_id || invoice.nurseryId !== profile.nursery_id) return false;
  return invoice.status === 'review' || invoice.status === 'returned';
}
