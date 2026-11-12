// UI guidance only; the database repeats these checks against locked, live rows (SQL 24).
// Nursery (own invoices only):
//   approved            → locked
//   returned / rejected → can delete (even if approved earlier or the advance is closed)
//   under review        → can delete while the advance is open
export function canDeleteInvoice(profile, invoice) {
  if (!profile || profile.active === false || !invoice) return false;
  if (profile.role === 'super_admin') return true;
  if (profile.role === 'admin') return profile.permissions?.invoices === true;
  if (profile.role !== 'nursery' || !profile.nursery_id || invoice.nurseryId !== profile.nursery_id) return false;
  if (invoice.status === 'approved') return false;
  if (invoice.status === 'returned' || invoice.status === 'rejected') return true;
  return !invoice.advanceAllocationId || invoice.advanceStatus === 'open';
}
