-- SAAMS V36 — حذف الفواتير لكل الحضانات + تعديل تاريخ الفاتورة
-- Safe to run more than once. Deletes nothing by itself. Self-contained (does not need files 14 or 24).
-- Nursery (own invoices only):
--   delete      → any invoice that is NOT approved (under review, returned, rejected — any advance state)
--   change date → while the invoice is under review or returned (existing update policy)
-- Approved invoices: only the administration. Every deletion is written to the audit log.

create or replace function public.guard_saams_invoice_deletion()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  actor public.profiles%rowtype;
  administrator boolean;
begin
  select * into actor from public.profiles where id = auth.uid();
  if not found or actor.active is not true then
    raise exception 'INVOICE_DELETE_FORBIDDEN' using errcode = '42501';
  end if;
  administrator := coalesce(actor.role = 'super_admin' or
    (actor.role = 'admin' and coalesce((actor.permissions->>'invoices')::boolean, false)), false);
  if not administrator then
    if actor.role is distinct from 'nursery' or actor.nursery_id is null or
       old.nursery_id is distinct from actor.nursery_id then
      raise exception 'INVOICE_DELETE_FORBIDDEN' using errcode = '42501';
    end if;
    if old.status = 'approved' then
      raise exception 'INVOICE_DELETE_LOCKED' using errcode = '42501';
    end if;
  end if;
  insert into public.audit_logs
    (user_id, nursery_id, screen, action, action_type, entity_type, entity_id, details, before_data, after_data)
  values
    (actor.id, old.nursery_id, 'الفواتير', 'حذف فاتورة', 'delete', 'invoice', old.id::text,
     coalesce(old.invoice_number, '') || ' — ' || coalesce(old.total_amount, 0)::text || ' AED',
     to_jsonb(old) || jsonb_build_object('deleted_by_role', actor.role), null);
  return old;
end;
$fn$;
revoke all on function public.guard_saams_invoice_deletion() from public, anon, authenticated;
drop trigger if exists saams_invoice_deletion_guard on public.invoices;
create trigger saams_invoice_deletion_guard before delete on public.invoices
  for each row execute function public.guard_saams_invoice_deletion();

-- The app deletes through this function (the trigger above decides who may delete).
create or replace function public.delete_saams_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then
    raise exception 'INVOICE_DELETE_FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$fn$;
revoke all on function public.delete_saams_invoice(uuid) from public, anon;
grant execute on function public.delete_saams_invoice(uuid) to authenticated;

-- A nursery may correct the date of its own invoice, but never move it to another nursery/advance or touch approval.
create or replace function public.guard_saams_invoice_scope_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare actor public.profiles%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.role = 'nursery' and
     (new.nursery_id is distinct from old.nursery_id
      or new.advance_allocation_id is distinct from old.advance_allocation_id
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by
      or old.status = 'approved' or new.status = 'approved') then
    raise exception 'INVOICE_SCOPE_CHANGE_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$fn$;
revoke all on function public.guard_saams_invoice_scope_update() from public, anon, authenticated;
drop trigger if exists saams_invoice_scope_update_guard on public.invoices;
create trigger saams_invoice_scope_update_guard before update on public.invoices
  for each row execute function public.guard_saams_invoice_scope_update();

notify pgrst, 'reload schema';

select 'nursery_delete_and_date_edit_ready' as status,
       count(*) filter (where status <> 'approved') as deletable_by_nurseries,
       count(*) filter (where status = 'approved') as approved_admin_only
from public.invoices;
