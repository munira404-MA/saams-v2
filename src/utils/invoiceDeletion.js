// UI guidance only; the database repeats these checks against locked, live rows.
export function canDeleteInvoice(profile, invoice) {
  if (!profile || profile.active === false || !invoice) return false;
  if (profile.role === 'super_admin') return true;
  if (profile.role === 'admin') return profile.permissions?.invoices === true;
  return profile.role === 'nursery'
    && Boolean(profile.nursery_id)
    && invoice.nurseryId === profile.nursery_id
    && invoice.status !== 'approved'
    && !invoice.approvedAt
    && (!invoice.advanceAllocationId || invoice.advanceStatus === 'open');
}
