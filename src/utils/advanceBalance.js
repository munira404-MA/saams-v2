// Advance balance rule (V18):
// An invoice is deducted from the nursery's advance as soon as it is uploaded (under review)
// and stays deducted when approved. Its amount goes back to the balance only if the
// administration RETURNS it for editing or REJECTS it. Re-submitting deducts it again.
export const DEDUCTED_STATUSES = ['review', 'approved'];

export function isDeductedInvoice(status) {
  return DEDUCTED_STATUSES.includes(String(status || 'review'));
}

export function balanceBreakdown(invoices = []) {
  let approved = 0, pending = 0;
  for (const inv of invoices) {
    const amount = Number(inv.amount ?? inv.total ?? inv.total_amount ?? 0);
    if (inv.status === 'approved') approved += amount;
    else if (isDeductedInvoice(inv.status)) pending += amount;
  }
  return { approved, pending, deducted: approved + pending };
}
