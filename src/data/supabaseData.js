import { supabase } from '../supabase';

export function isSupabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function safeFileName(name = 'file') {
  return name.replace(/[^\w.\-]+/g, '_');
}

export async function getCurrentProfile() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*, nurseries(id,name_ar,name_en)')
    .eq('id', authData.user.id)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    role: data.role,
    nursery_id: data.nursery_id,
    nursery: data.nurseries?.name_ar || '',
    nursery_en: data.nurseries?.name_en || '',
    permissions: data.permissions || {},
    active: data.active,
    email: authData.user.email,
  };
}

export async function signInWithUsername(username, password) {
  const normalized = String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!normalized) throw new Error('INVALID_USERNAME');
  const email = `${normalized}@saams.local`;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await getCurrentProfile();
  if (!profile?.active) {
    await supabase.auth.signOut();
    throw new Error('ACCOUNT_DISABLED');
  }
  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function listNurseries() {
  const { data, error } = await supabase
    .from('nurseries')
    .select('id,name_ar,name_en,active')
    .order('name_ar');
  if (error) throw error;
  return data || [];
}

export async function findNurseryByName(name) {
  if (!name) return null;
  const { data, error } = await supabase
    .from('nurseries')
    .select('id,name_ar,name_en')
    .or(`name_ar.eq.${name},name_en.eq.${name}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      nurseries(name_ar,name_en),
      advance_allocations(
        id,
        advances(code,name_ar,name_en)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    dbId: row.id,
    id: row.invoice_number,
    nurseryId: row.nursery_id,
    nurseryAr: row.nurseries?.name_ar || '',
    nurseryEn: row.nurseries?.name_en || '',
    advanceAllocationId: row.advance_allocation_id,
    advanceAr: row.advance_allocations?.advances?.name_ar || '',
    advanceEn: row.advance_allocations?.advances?.name_en || '',
    supplierAr: row.supplier_name,
    supplierEn: row.supplier_name,
    date: row.invoice_date || '',
    subtotal: Number(row.subtotal || 0),
    total: Number(row.total_amount || 0),
    vat: Number(row.vat_amount || 0),
    payment: row.payment_method,
    status: row.status,
    trn: row.trn || '',
    returnReason: row.return_reason || '',
    attachmentPath: row.attachment_path || '',
    receiptPath: row.receipt_path || '',
    approvedAt: row.approved_at,
    returnedAt: row.returned_at,
    createdAt: row.created_at,
    ocrPayload: row.ocr_payload || {},
  }));
}

export async function listOpenAdvanceAllocations(nurseryId = null) {
  let query = supabase
    .from('advance_allocations')
    .select(`
      id, nursery_id, allocated,
      nurseries(name_ar,name_en),
      advances!inner(id,code,name_ar,name_en,status,date_from,date_to)
    `)
    .eq('advances.status', 'open');
  if (nurseryId) query = query.eq('nursery_id', nurseryId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function uploadInvoiceFile({ nurseryId, invoiceDbId, file, kind }) {
  if (!file) return '';
  const path = `${nurseryId}/${invoiceDbId}/${kind}_${Date.now()}_${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from('saams-invoices')
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

export async function createInvoice(payload, invoiceFile, receiptFile) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData?.user?.id || null;
  if (!userId) throw new Error('AUTH_SESSION_MISSING');

  // Resolve the current user's scope from Supabase at save time.
  // Nursery accounts are never allowed to trust a nursery id coming from the UI.
  const { data: liveProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,nursery_id,active,nurseries(id,name_ar,name_en)')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;
  if (liveProfile?.active === false) throw new Error('ACCOUNT_DISABLED');

  let resolvedNurseryId = payload.nurseryId || null;
  let resolvedAllocationId = payload.advanceAllocationId || null;

  if (liveProfile?.role === 'nursery') {
    resolvedNurseryId = liveProfile.nursery_id || null;
    if (!resolvedNurseryId) throw new Error('NURSERY_SCOPE_MISSING');

    // Validate a chosen allocation against the logged-in nursery.
    if (resolvedAllocationId) {
      const { data: selectedAllocation, error: allocationCheckError } = await supabase
        .from('advance_allocations')
        .select('id,nursery_id,advances!inner(status)')
        .eq('id', resolvedAllocationId)
        .eq('nursery_id', resolvedNurseryId)
        .eq('advances.status', 'open')
        .maybeSingle();
      if (allocationCheckError) throw allocationCheckError;
      if (!selectedAllocation?.id) resolvedAllocationId = null;
    }

    // If the nursery has exactly one open allocation, attach it automatically.
    if (!resolvedAllocationId) {
      const { data: openAllocations, error: openAllocationError } = await supabase
        .from('advance_allocations')
        .select('id,advances!inner(status)')
        .eq('nursery_id', resolvedNurseryId)
        .eq('advances.status', 'open')
        .limit(2);
      if (openAllocationError) throw openAllocationError;
      if ((openAllocations || []).length === 1) {
        resolvedAllocationId = openAllocations[0].id;
      } else if ((openAllocations || []).length === 0) {
        const err = new Error('NO_OPEN_ADVANCE');
        err.code = 'NO_OPEN_ADVANCE';
        throw err;
      } else {
        const err = new Error('MULTIPLE_OPEN_ADVANCES');
        err.code = 'MULTIPLE_OPEN_ADVANCES';
        throw err;
      }
    }
  }

  if (!resolvedNurseryId) throw new Error('NURSERY_NOT_FOUND');

  const insertPayload = {
    invoice_number: payload.id,
    nursery_id: resolvedNurseryId,
    advance_allocation_id: resolvedAllocationId,
    supplier_name: payload.supplierAr || payload.supplierEn,
    invoice_date: normalizeDate(payload.date),
    subtotal: Number(payload.subtotal || Math.max(0, Number(payload.total || 0) - Number(payload.vat || 0))),
    vat_amount: Number(payload.vat || 0),
    total_amount: Number(payload.total || 0),
    trn: payload.trn || null,
    payment_method: payload.payment || 'cash',
    status: payload.status || 'review',
    ocr_payload: payload.ocrPayload || {},
    uploaded_by: userId,
  };

  const { data, error } = await supabase
    .from('invoices')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) throw error;

  let attachmentPath = '';
  let receiptPath = '';
  try {
    attachmentPath = await uploadInvoiceFile({
      nurseryId: resolvedNurseryId,
      invoiceDbId: data.id,
      file: invoiceFile,
      kind: 'invoice',
    });
    receiptPath = await uploadInvoiceFile({
      nurseryId: resolvedNurseryId,
      invoiceDbId: data.id,
      file: receiptFile,
      kind: 'receipt',
    });
    if (attachmentPath || receiptPath) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ attachment_path: attachmentPath || null, receipt_path: receiptPath || null })
        .eq('id', data.id);
      if (updateError) throw updateError;
    }
  } catch (fileError) {
    console.error('Invoice file upload failed:', fileError);
  }
  return { dbId: data.id, attachmentPath, receiptPath };
}

export async function updateInvoiceStatus(invoice, status, reason = '') {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || null;
  const now = new Date().toISOString();
  const patch = { status, return_reason: reason || null };
  if (status === 'approved') {
    patch.approved_by = userId;
    patch.approved_at = now;
    patch.returned_by = null;
    patch.returned_at = null;
  }
  if (status === 'returned') {
    patch.returned_by = userId;
    patch.returned_at = now;
  }
  const query = supabase.from('invoices').update(patch);
  const { error } = invoice.dbId
    ? await query.eq('id', invoice.dbId)
    : await query.eq('invoice_number', invoice.id).eq('nursery_id', invoice.nurseryId);
  if (error) throw error;
  return now;
}

export async function getSignedInvoiceUrl(path, expiresIn = 900) {
  if (!path) return '';
  const { data, error } = await supabase.storage
    .from('saams-invoices')
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || '';
}

export async function listAdvances() {
  const { data, error } = await supabase
    .from('advances')
    .select(`
      *,
      advance_allocations(
        id, nursery_id, allocated,
        nurseries(name_ar,name_en),
        invoices(invoice_number,supplier_name,invoice_date,total_amount,status)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    dbId: row.id,
    id: row.code,
    nameAr: row.name_ar,
    nameEn: row.name_en || row.name_ar,
    type: row.advance_type,
    from: row.date_from,
    to: row.date_to,
    status: row.status,
    allocations: (row.advance_allocations || []).map((allocation) => ({
      dbId: allocation.id,
      nurseryId: allocation.nursery_id,
      nurseryAr: allocation.nurseries?.name_ar || '',
      nurseryEn: allocation.nurseries?.name_en || '',
      allocated: Number(allocation.allocated || 0),
      invoices: (allocation.invoices || [])
        .filter((invoice) => invoice.status === 'approved')
        .map((invoice) => ({
          no: invoice.invoice_number,
          supplierAr: invoice.supplier_name,
          supplierEn: invoice.supplier_name,
          date: invoice.invoice_date,
          amount: Number(invoice.total_amount || 0),
        })),
    })),
  }));
}

export async function createAdvance(payload) {
  const { data: userData } = await supabase.auth.getUser();
  const { data: advance, error } = await supabase
    .from('advances')
    .insert({
      code: payload.id,
      name_ar: payload.nameAr,
      name_en: payload.nameEn,
      advance_type: payload.type,
      date_from: payload.from || null,
      date_to: payload.to || null,
      status: payload.status,
      created_by: userData?.user?.id || null,
    })
    .select('id')
    .single();
  if (error) throw error;

  const allocations = payload.allocations.map((row) => ({
    advance_id: advance.id,
    nursery_id: row.nurseryId,
    allocated: Number(row.allocated || 0),
  }));
  const { error: allocationError } = await supabase
    .from('advance_allocations')
    .insert(allocations);
  if (allocationError) throw allocationError;
  return advance.id;
}

export async function toggleAdvanceStatus(advance, status) {
  const query = supabase.from('advances').update({ status });
  const { error } = advance.dbId
    ? await query.eq('id', advance.dbId)
    : await query.eq('code', advance.id);
  if (error) throw error;
}


export async function deleteAdvance(advance) {
  let advanceId = advance?.dbId || null;
  if (!advanceId && advance?.id) {
    const { data, error } = await supabase
      .from('advances')
      .select('id')
      .eq('code', advance.id)
      .maybeSingle();
    if (error) throw error;
    advanceId = data?.id || null;
  }
  if (!advanceId) throw new Error('ADVANCE_NOT_FOUND');

  const { data: allocations, error: allocationsError } = await supabase
    .from('advance_allocations')
    .select('id')
    .eq('advance_id', advanceId);
  if (allocationsError) throw allocationsError;

  const allocationIds = (allocations || []).map((row) => row.id);
  if (allocationIds.length) {
    const { count, error: invoiceError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .in('advance_allocation_id', allocationIds);
    if (invoiceError) throw invoiceError;
    if (Number(count || 0) > 0) {
      const error = new Error('ADVANCE_HAS_INVOICES');
      error.code = 'ADVANCE_HAS_INVOICES';
      error.invoiceCount = Number(count || 0);
      throw error;
    }
  }

  const { error } = await supabase.from('advances').delete().eq('id', advanceId);
  if (error) throw error;
}

export async function writeAuditLog(payload) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;
  const { error } = await supabase.from('audit_logs').insert({
    user_id: userData.user.id,
    nursery_id: payload.nurseryId || null,
    screen: payload.screen,
    action: payload.action,
    action_type: payload.actionType,
    entity_type: payload.entityType || null,
    entity_id: payload.entityId || null,
    details: payload.details || null,
    reason: payload.reason || null,
    before_data: payload.before || null,
    after_data: payload.after || null,
  });
  if (error) console.error('Audit insert failed:', error);
}

export function normalizeDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = String(value).split(/[\/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return null;
}
